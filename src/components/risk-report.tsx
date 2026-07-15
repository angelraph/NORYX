"use client";

import { useState } from "react";
import { formatUnits, type Address } from "viem";
import { useConnection } from "wagmi";
import {
  useApprovalScan,
  DEFAULT_WINDOW_BLOCKS,
  type LiveApproval,
} from "@/hooks/use-approval-scan";
import { useSpenderMetadata } from "@/hooks/use-spender-metadata";
import {
  assessApprovalRisk,
  computeWalletHealth,
  computeContractFlags,
  riskLevelPenalty,
  UNLIMITED_THRESHOLD,
  type ApprovalRisk,
  type SpenderMetadata,
  type ContractFlag,
} from "@/lib/risk";
import { monadTestnet } from "@/lib/chains";
import { useRevokeApproval } from "@/hooks/use-revoke-approval";
import { useSecurityProfile } from "@/hooks/use-security-profile";

const MAX_WINDOW_BLOCKS = 60_000n;
const TRACKED_SYMBOLS = "USDC, WETH, WMON";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAmount(value: bigint, decimals: number) {
  if (value >= UNLIMITED_THRESHOLD) return "Unlimited";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

const riskStyles: Record<ApprovalRisk["level"], string> = {
  high: "border-red-500/30 bg-red-500/10 text-red-400",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

const flagStyles: Record<ContractFlag["tone"], string> = {
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  info: "border-white/10 bg-white/5 text-white/50",
};

function ApprovalRow({
  approval,
  risk,
  violatesPolicy,
  contractFlags,
}: {
  approval: LiveApproval;
  risk: ApprovalRisk;
  violatesPolicy: boolean;
  contractFlags: ContractFlag[];
}) {
  const { revoke, isPending, isConfirming, isConfirmed, error } =
    useRevokeApproval();
  const busy = isPending || isConfirming;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-white">
          {approval.token.symbol}{" "}
          <span className="font-normal text-white/40">approved to</span>{" "}
          <a
            href={`${monadTestnet.blockExplorers.default.url}/address/${approval.spender}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-white/70 underline decoration-white/20 underline-offset-2 hover:text-white"
          >
            {shortenAddress(approval.spender)}
          </a>
        </p>
        <p className="mt-1 text-sm text-white/50">{risk.reasons[0]}</p>
        {violatesPolicy && (
          <p className="mt-1 text-xs font-semibold text-fuchsia-400">
            Violates your saved security policy (unlimited approvals blocked).
          </p>
        )}
        {contractFlags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {contractFlags.map((flag) => (
              <span
                key={flag.label}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${flagStyles[flag.tone]}`}
              >
                {flag.label}
              </span>
            ))}
          </div>
        )}
        {error && (
          <p className="mt-1 text-xs text-red-400">{error.message}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-white/80">
          {formatAmount(approval.allowance, approval.token.decimals)}{" "}
          {approval.token.symbol}
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${riskStyles[risk.level]}`}
        >
          {risk.level}
        </span>
        <button
          onClick={() => revoke(approval.token.address, approval.spender)}
          disabled={busy || isConfirmed}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
        >
          {isConfirmed
            ? "Revoked"
            : isConfirming
              ? "Confirming..."
              : isPending
                ? "Confirm in wallet..."
                : "Revoke"}
        </button>
      </div>
    </div>
  );
}

export function RiskReport() {
  const { isConnected, chainId } = useConnection();
  const [windowBlocks, setWindowBlocks] = useState(DEFAULT_WINDOW_BLOCKS);
  const { data, isLoading, isFetching, isError, error } =
    useApprovalScan(windowBlocks);
  const { profile } = useSecurityProfile();

  const approvals = data?.approvals ?? [];
  const uniqueSpenders = Array.from(new Set(approvals.map((a) => a.spender)));
  const { data: spenderMetadata } = useSpenderMetadata(
    uniqueSpenders,
    data?.scannedToBlock,
  );

  if (!isConnected || chainId !== monadTestnet.id) return null;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50">
        Scanning live approvals on Monad Testnet...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-400">
        Failed to scan approvals:{" "}
        {error instanceof Error ? error.message : "unknown error"}
      </div>
    );
  }

  const risks = approvals.map((a) =>
    assessApprovalRisk({ allowance: a.allowance, balance: a.balance }),
  );
  const contractFlagsByIndex = approvals.map((a) =>
    computeContractFlags(
      spenderMetadata?.get(a.spender as Address) as SpenderMetadata | undefined,
      data?.scannedToBlock,
    ),
  );
  const penalties = risks.map((r, i) => {
    const contractPenalty = contractFlagsByIndex[i].reduce(
      (sum, f) => sum + f.penalty,
      0,
    );
    return riskLevelPenalty(r.level) + contractPenalty;
  });
  const health = computeWalletHealth(penalties);
  const highCount = risks.filter((r) => r.level === "high").length;
  const mediumCount = risks.filter((r) => r.level === "medium").length;
  const lowCount = approvals.length - highCount - mediumCount;
  const contractWarnings = contractFlagsByIndex
    .flat()
    .filter((f) => f.tone === "warn").length;

  const scannedBlockSpan = data
    ? data.scannedToBlock - data.scannedFromBlock
    : 0n;
  const canScanFurther = windowBlocks < MAX_WINDOW_BLOCKS;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
        <p className="text-sm text-white/40">Wallet Security Score</p>
        <p className="mt-1 text-5xl font-semibold text-white">{health}/100</p>
        <p className="mt-3 text-sm text-white/50">
          {approvals.length === 0
            ? "No active token approvals found in the scanned range."
            : `${highCount} high risk, ${mediumCount} medium risk, ${lowCount} low risk, out of ${approvals.length} active approval${approvals.length === 1 ? "" : "s"}${contractWarnings > 0 ? `, plus ${contractWarnings} contract-level warning${contractWarnings === 1 ? "" : "s"}` : ""}.`}
        </p>
        <p className="mt-1 text-xs text-white/30">
          Scanned the last ~{scannedBlockSpan.toString()} blocks (
          {TRACKED_SYMBOLS}) on Monad Testnet — live on every load, nothing
          cached or mocked.
        </p>
      </div>

      {approvals.length > 0 && (
        <div className="flex flex-col gap-3">
          {approvals.map((approval, i) => (
            <ApprovalRow
              key={`${approval.token.address}-${approval.spender}`}
              approval={approval}
              risk={risks[i]}
              contractFlags={contractFlagsByIndex[i]}
              violatesPolicy={
                !!profile?.exists &&
                profile.blockUnlimitedApprovals &&
                approval.allowance >= UNLIMITED_THRESHOLD
              }
            />
          ))}
        </div>
      )}

      {canScanFurther && (
        <button
          onClick={() =>
            setWindowBlocks((w) =>
              w * 3n > MAX_WINDOW_BLOCKS ? MAX_WINDOW_BLOCKS : w * 3n,
            )
          }
          disabled={isFetching}
          className="self-start rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/30 hover:text-white disabled:opacity-50"
        >
          {isFetching ? "Scanning..." : "Scan further back"}
        </button>
      )}
    </div>
  );
}
