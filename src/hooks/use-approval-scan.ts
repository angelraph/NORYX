"use client";

import { useQuery } from "@tanstack/react-query";
import { useConnection, usePublicClient } from "wagmi";
import type { Address, PublicClient } from "viem";
import { TRACKED_TOKENS, type TrackedToken } from "@/lib/tokens";
import { erc20Abi } from "@/lib/erc20-abi";
import { monadTestnet } from "@/lib/chains";

// The public Monad Testnet RPC caps eth_getLogs to a 100-block range per
// call AND rate-limits to 25 requests/sec overall, so historical scanning
// has to run as one globally-concurrency-limited queue across every tracked
// token, not a naive per-token burst — a per-token pool would multiply by
// TRACKED_TOKENS.length and blow through the rate limit.
const CHUNK_SIZE = 100n;
export const DEFAULT_WINDOW_BLOCKS = 6_000n; // roughly the last ~100 minutes
const GLOBAL_CONCURRENCY = 8;
const MAX_RETRIES = 5;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("limited to") || message.includes("-32011");
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );
  return results;
}

async function getLogsWithRetry(
  client: PublicClient,
  token: Address,
  owner: Address,
  fromBlock: bigint,
  toBlock: bigint,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await client.getLogs({
        address: token,
        event: approvalEventAbi,
        args: { owner },
        fromBlock,
        toBlock,
      });
    } catch (err) {
      if (isRateLimitError(err) && attempt < MAX_RETRIES) {
        await sleep(250 * (attempt + 1) + Math.random() * 150);
        continue;
      }
      throw err;
    }
  }
}

type ChunkTask = { token: TrackedToken; fromBlock: bigint; toBlock: bigint };

function buildChunkTasks(fromBlock: bigint, toBlock: bigint): ChunkTask[] {
  const tasks: ChunkTask[] = [];
  for (const token of TRACKED_TOKENS) {
    for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
      const end = start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n;
      tasks.push({ token, fromBlock: start, toBlock: end });
    }
  }
  return tasks;
}

export function useApprovalScan(windowBlocks: bigint = DEFAULT_WINDOW_BLOCKS) {
  const { address, isConnected, chainId } = useConnection();
  const publicClient = usePublicClient({ chainId: monadTestnet.id });

  const enabled =
    isConnected && !!address && chainId === monadTestnet.id && !!publicClient;

  return useQuery({
    queryKey: ["approval-scan", address, windowBlocks.toString()],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const client = publicClient as PublicClient;
      const owner = address as Address;

      const latest = await client.getBlockNumber();
      const fromBlock = latest > windowBlocks ? latest - windowBlocks : 0n;

      const chunkTasks = buildChunkTasks(fromBlock, latest);
      const chunkResults = await runWithConcurrency(
        chunkTasks.map(
          (c) => () =>
            getLogsWithRetry(client, c.token.address, owner, c.fromBlock, c.toBlock),
        ),
        GLOBAL_CONCURRENCY,
      );

      const spendersByToken = new Map<Address, Set<Address>>();
      TRACKED_TOKENS.forEach((token) => spendersByToken.set(token.address, new Set()));
      chunkTasks.forEach((task, i) => {
        for (const log of chunkResults[i]) {
          const spender = log.args.spender;
          if (spender) spendersByToken.get(task.token.address)?.add(spender);
        }
      });

      const pairs: { token: TrackedToken; spender: Address }[] = [];
      TRACKED_TOKENS.forEach((token) => {
        for (const spender of spendersByToken.get(token.address) ?? []) {
          pairs.push({ token, spender });
        }
      });

      const balanceResults = await client.multicall({
        contracts: TRACKED_TOKENS.map((token) => ({
          address: token.address,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [owner] as const,
        })),
        allowFailure: true,
      });

      const balanceByToken = new Map<Address, bigint>();
      TRACKED_TOKENS.forEach((token, i) => {
        const result = balanceResults[i];
        balanceByToken.set(
          token.address,
          result.status === "success" ? (result.result as bigint) : 0n,
        );
      });

      if (pairs.length === 0) {
        return {
          approvals: [] as LiveApproval[],
          scannedFromBlock: fromBlock,
          scannedToBlock: latest,
          balances: TRACKED_TOKENS.map((token) => ({
            token,
            balance: balanceByToken.get(token.address) ?? 0n,
          })),
        };
      }

      const allowanceResults = await client.multicall({
        contracts: pairs.map(({ token, spender }) => ({
          address: token.address,
          abi: erc20Abi,
          functionName: "allowance" as const,
          args: [owner, spender] as const,
        })),
        allowFailure: true,
      });

      const approvals: LiveApproval[] = [];
      pairs.forEach((pair, i) => {
        const result = allowanceResults[i];
        if (result.status !== "success") return;
        const allowance = result.result as bigint;
        if (allowance === 0n) return;
        approvals.push({
          token: pair.token,
          spender: pair.spender,
          allowance,
          balance: balanceByToken.get(pair.token.address) ?? 0n,
        });
      });

      return {
        approvals,
        scannedFromBlock: fromBlock,
        scannedToBlock: latest,
        balances: TRACKED_TOKENS.map((token) => ({
          token,
          balance: balanceByToken.get(token.address) ?? 0n,
        })),
      };
    },
  });
}
