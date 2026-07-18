"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address, PublicClient } from "viem";
import { TRACKED_TOKENS, type TrackedToken } from "@/lib/tokens";
import { erc20Abi } from "@/lib/erc20-abi";
import { monad } from "@/lib/chains";
import { rpcCall } from "@/lib/rpc-utils";

// Reflects real phase transitions inside the scan loop below — not a
// simulated timer. Read by RiskReport to show which stage of the audit is
// actually in flight right now.
export type ScanStage = "loading-approvals" | "checking-allowances" | "done";

// The public Monad Mainnet RPC caps eth_getLogs to a 100-block range per
// call (confirmed directly: a 500-block range returns -32614 "limited to a
// 100 range") — so historical scanning has to run in bounded chunks, and
// scanning further back costs real wall-clock time. The scan below handles
// that by scanning a fast, small window first for an instant first result,
// then growing the window in the background — re-fetching only the
// newly-added slice each round, never blocks already covered.
//
// Block-count constants below are scaled for Monad Mainnet's ~0.4s block
// time (confirmed directly via block timestamps — 2.5x faster than
// testnet's ~1s), so they preserve the same real-world coverage windows.
const CHUNK_SIZE = 100n;
const FAST_PASS_BLOCKS = 15_000n; // ~100 min at Monad Mainnet's ~0.4s block time
const AUTO_CEILING_BLOCKS = 252_000n; // ~28h — auto-scanned with no user action needed
export const HARD_CEILING_BLOCKS = 2_484_000n; // ~11.5 days — reachable via "scan even further"
const GROWTH_FACTOR = 3n;

const approvalEventAbi = {
  type: "event",
  name: "Approval",
  inputs: [
    { name: "owner", type: "address", indexed: true },
    { name: "spender", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

export type LiveApproval = {
  token: TrackedToken;
  spender: Address;
  allowance: bigint;
  balance: bigint;
};

type TokenBalance = { token: TrackedToken; balance: bigint };

type ChunkTask = { token: TrackedToken; fromBlock: bigint; toBlock: bigint };

function buildChunkTasks(fromBlock: bigint, toBlock: bigint): ChunkTask[] {
  const tasks: ChunkTask[] = [];
  if (fromBlock > toBlock) return tasks;
  for (const token of TRACKED_TOKENS) {
    for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
      const end = start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n;
      tasks.push({ token, fromBlock: start, toBlock: end });
    }
  }
  return tasks;
}

type ScanState = {
  approvals: LiveApproval[];
  balances: TokenBalance[];
  scannedFromBlock: bigint;
  scannedToBlock: bigint;
  windowBlocks: bigint;
  isLoading: boolean;
  isScanningDeeper: boolean;
  isError: boolean;
  error: Error | null;
  stage: ScanStage;
};

const initialState: ScanState = {
  approvals: [],
  balances: [],
  scannedFromBlock: 0n,
  scannedToBlock: 0n,
  windowBlocks: 0n,
  isLoading: false,
  isScanningDeeper: false,
  isError: false,
  error: null,
  stage: "loading-approvals",
};

export function useApprovalScan(viewAddress: Address | undefined) {
  const address = viewAddress;
  const publicClient = usePublicClient({ chainId: monad.id });
  const [state, setState] = useState<ScanState>(initialState);

  // Per-session mutable scan state that must never trigger its own render —
  // only setState calls (gated by a generation check) do that.
  const generationRef = useRef(0);
  const sessionRef = useRef<{
    client: PublicClient;
    owner: Address;
    latest: bigint;
    knownSpenders: Map<Address, Set<Address>>; // token address -> spenders already checked
    approvals: LiveApproval[];
    balances: TokenBalance[];
  } | null>(null);

  const enabled = !!address && !!publicClient;

  const runSlice = useCallback(
    async (
      generation: number,
      sliceFromBlock: bigint,
      sliceToBlock: bigint,
      priority: "high" | "low" = "high",
    ) => {
      const session = sessionRef.current;
      if (!session || generation !== generationRef.current) return;
      if (sliceFromBlock > sliceToBlock) return;

      const chunkTasks = buildChunkTasks(sliceFromBlock, sliceToBlock);
      const chunkResults = await Promise.all(
        chunkTasks.map((c) =>
          rpcCall(
            () =>
              session.client.getLogs({
                address: c.token.address,
                event: approvalEventAbi,
                args: { owner: session.owner },
                fromBlock: c.fromBlock,
                toBlock: c.toBlock,
              }),
            priority,
          ),
        ),
      );
      if (generation !== generationRef.current) return;

      const newPairs: { token: TrackedToken; spender: Address }[] = [];
      chunkTasks.forEach((task, i) => {
        const seen = session.knownSpenders.get(task.token.address)!;
        for (const log of chunkResults[i]) {
          const spender = log.args.spender;
          if (spender && !seen.has(spender)) {
            seen.add(spender);
            newPairs.push({ token: task.token, spender });
          }
        }
      });

      if (newPairs.length > 0) {
        const allowanceResults = await rpcCall(
          () =>
            session.client.multicall({
              contracts: newPairs.map(({ token, spender }) => ({
                address: token.address,
                abi: erc20Abi,
                functionName: "allowance" as const,
                args: [session.owner, spender] as const,
              })),
              allowFailure: true,
            }),
          priority,
        );
        if (generation !== generationRef.current) return;

        newPairs.forEach((pair, i) => {
          const result = allowanceResults[i];
          if (result.status !== "success") return;
          const allowance = result.result as bigint;
          if (allowance === 0n) return;
          const balance =
            session.balances.find((b) => b.token.address === pair.token.address)
              ?.balance ?? 0n;
          session.approvals.push({
            token: pair.token,
            spender: pair.spender,
            allowance,
            balance,
          });
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setState(initialState);
      return;
    }

    const generation = ++generationRef.current;
    setState({ ...initialState, isLoading: true });

    (async () => {
      const client = publicClient as PublicClient;
      const owner = address as Address;

      try {
        const latest = await rpcCall(() => client.getBlockNumber());
        if (generation !== generationRef.current) return;

        const knownSpenders = new Map<Address, Set<Address>>();
        TRACKED_TOKENS.forEach((t) => knownSpenders.set(t.address, new Set()));

        sessionRef.current = {
          client,
          owner,
          latest,
          knownSpenders,
          approvals: [],
          balances: [],
        };

        const balanceResults = await rpcCall(() =>
          client.multicall({
            contracts: TRACKED_TOKENS.map((token) => ({
              address: token.address,
              abi: erc20Abi,
              functionName: "balanceOf" as const,
              args: [owner] as const,
            })),
            allowFailure: true,
          }),
        );
        if (generation !== generationRef.current) return;

        const balances: TokenBalance[] = TRACKED_TOKENS.map((token, i) => {
          const result = balanceResults[i];
          return {
            token,
            balance: result.status === "success" ? (result.result as bigint) : 0n,
          };
        });
        sessionRef.current.balances = balances;

        // Fast pass: small window, first result in a few seconds.
        let coveredFromBlock = latest + 1n; // sentinel: nothing covered yet
        let windowBlocks = latest > FAST_PASS_BLOCKS ? FAST_PASS_BLOCKS : latest;
        const fastFromBlock = latest - windowBlocks;

        setState((s) => ({ ...s, stage: "checking-allowances" }));
        await runSlice(generation, fastFromBlock, latest, "high");
        if (generation !== generationRef.current) return;
        coveredFromBlock = fastFromBlock;

        setState({
          ...initialState,
          approvals: [...sessionRef.current.approvals],
          balances,
          scannedFromBlock: coveredFromBlock,
          scannedToBlock: latest,
          windowBlocks,
          isLoading: false,
          isScanningDeeper: windowBlocks < AUTO_CEILING_BLOCKS && coveredFromBlock > 0n,
          stage: "done",
        });

        // Background auto-continue up to AUTO_CEILING_BLOCKS, re-fetching
        // only each newly-added slice.
        while (
          generation === generationRef.current &&
          windowBlocks < AUTO_CEILING_BLOCKS &&
          coveredFromBlock > 0n
        ) {
          const nextWindow =
            windowBlocks * GROWTH_FACTOR > AUTO_CEILING_BLOCKS
              ? AUTO_CEILING_BLOCKS
              : windowBlocks * GROWTH_FACTOR;
          const nextFromBlock = latest > nextWindow ? latest - nextWindow : 0n;
          const sliceTo = coveredFromBlock - 1n;

          if (nextFromBlock < coveredFromBlock) {
            await runSlice(generation, nextFromBlock, sliceTo, "low");
            if (generation !== generationRef.current) return;
          }

          windowBlocks = nextWindow;
          coveredFromBlock = nextFromBlock;

          setState((s) => ({
            ...s,
            approvals: [...sessionRef.current!.approvals],
            scannedFromBlock: coveredFromBlock,
            windowBlocks,
            isScanningDeeper: windowBlocks < AUTO_CEILING_BLOCKS && coveredFromBlock > 0n,
          }));
        }
      } catch (err) {
        if (generation !== generationRef.current) return;
        setState((s) => ({
          ...s,
          isLoading: false,
          isScanningDeeper: false,
          isError: true,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      }
    })();

    return () => {
      // Intentional: bumping this invalidates any in-flight rounds from this
      // session so they no-op instead of clobbering newer state.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generationRef.current++;
    };
  }, [address, enabled, publicClient, runSlice]);

  const scanFurther = useCallback(async () => {
    const generation = generationRef.current;
    const session = sessionRef.current;
    if (!session || state.isLoading || state.isScanningDeeper) return;

    setState((s) => ({ ...s, isScanningDeeper: true }));

    const currentWindow = state.windowBlocks;
    const nextWindow =
      currentWindow * GROWTH_FACTOR > HARD_CEILING_BLOCKS
        ? HARD_CEILING_BLOCKS
        : currentWindow * GROWTH_FACTOR;
    const nextFromBlock =
      session.latest > nextWindow ? session.latest - nextWindow : 0n;
    const sliceTo = state.scannedFromBlock - 1n;

    if (nextFromBlock < state.scannedFromBlock) {
      await runSlice(generation, nextFromBlock, sliceTo, "high");
      if (generation !== generationRef.current) return;
    }

    setState((s) => ({
      ...s,
      approvals: [...session.approvals],
      scannedFromBlock: nextFromBlock,
      windowBlocks: nextWindow,
      isScanningDeeper: false,
    }));
  }, [
    runSlice,
    state.windowBlocks,
    state.scannedFromBlock,
    state.isLoading,
    state.isScanningDeeper,
  ]);

  const canScanFurther =
    state.windowBlocks < HARD_CEILING_BLOCKS && state.scannedFromBlock > 0n;

  return { ...state, canScanFurther, scanFurther };
}
