"use client";

import { formatUnits, type Address } from "viem";
import { useApprovalScan, type LiveApproval } from "@/hooks/use-approval-scan";
import { useSpenderMetadata } from "@/hooks/use-spender-metadata";
import {
  assessApprovalRisk,
  computeWalletHealth,
  computeContractFlags,
  riskLevelPenalty,
  formatBlockAge,
  UNLIMITED_THRESHOLD,
  type ApprovalRisk,
  type SpenderMetadata,
  type ContractFlag,
} from "@/lib/risk";
import { monad } from "@/lib/chains";
import { useRevokeApproval } from "@/hooks/use-revoke-approval";
import { useSecurityProfile } from "@/hooks/use-security-profile";
import { OnchainScoreCard } from "@/components/onchain-score-card";

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

// Each step here is gated on a real async phase actually completing (see
// useApprovalScan's ScanStage and useSpenderMetadata's isLoading), not a
// timer standing in for work that isn't really happening.
const PROGRESS_STEPS = [
  { key: "loading-approvals", label: "Reading wallet approvals" },
  { key: "checking-allowances", label: "Verifying live allowances" },
  { key: "auditing-contracts", label: "Auditing spender contracts" },
] as const;

type ProgressStepKey = (typeof PROGRESS_STEPS)[number]["key"];

function ScanProgress({ current }: { current: ProgressStepKey }) {
  const currentIndex = PROGRESS_STEPS.findIndex((s) => s.key === current);

  return (
    <div className="rounded-2xl bg-linear-to-r from-monad-purple/40 to-monad-cyan/40 p-px">
      <div className="rounded-[15px] bg-black p-6 sm:p-8">
        <p className="font-display mb-4 bg-linear-to-r from-monad-purple to-monad-cyan bg-clip-text text-sm text-transparent">
          Running your wallet security audit...
        </p>
        <div className="flex flex-col gap-2.5">
          {PROGRESS_STEPS.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <div key={step.key} className="flex items-center gap-2.5 text-sm">
                <span
                  className={
                    done
                      ? "text-monad-cyan"
                      : active
                        ? "animate-pulse bg-linear-to-r from-monad-purple to-monad-cyan bg-clip-text text-transparent"
                        : "text-white/20"
                  }
                >
                  {done ? "✓" : active ? "●" : "○"}
                </span>
                <span className={done || active ? "text-white/80" : "text-white/30"}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ApprovalRow({
  approval,
  risk,
  violatesPolicy,
  contractFlags,
  isOwnWallet,
}: {
  approval: LiveApproval;
  risk: ApprovalRisk;
  violatesPolicy: boolean;
  contractFlags: ContractFlag[];
  isOwnWallet: boolean;
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
            href={`${monad.blockExplorers.default.url}/address/${approval.spender}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-white/70 underline decoration-white/20 underline-offset-2 hover:text-white"
          >
            {shortenAddress(approval.spender)}
          </a>
        </p>
        <p className="mt-1 text-sm text-white/50">{risk.reasons[0]}</p>
        {violatesPolicy && (
          <p className="mt-1 text-xs font-semibold text-monad-pink">
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
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
        <span className="font-mono text-sm text-white/80">
          {formatAmount(approval.allowance, approval.token.decimals)}{" "}
          {approval.token.symbol}
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${riskStyles[risk.level]}`}
        >
          {risk.level}
        </span>
        {isOwnWallet ? (
          <button
            onClick={() => revoke(approval.token.address, approval.spender)}
            disabled={busy || isConfirmed}
            className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
          >
            {isConfirmed
              ? "Revoked"
              : isConfirming
                ? "Confirming..."
                : isPending
                  ? "Confirm in wallet..."
                  : "Revoke"}
          </button>
        ) : (
          <span className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/30">
            Read-only
          </span>
        )}
      </div>
    </div>
  );
}

export function RiskReport({
  viewAddress,
  isOwnWallet,
}: {
  viewAddress: Address;
  isOwnWallet: boolean;
}) {
  const {
    approvals,
    scannedFromBlock,
    scannedToBlock,
    isLoading,
    isScanningDeeper,
    isError,
    error,
    stage,
    canScanFurther,
    scanFurther,
  } = useApprovalScan(viewAddress);
  const { profile } = useSecurityProfile(viewAddress);

  const uniqueSpenders = Array.from(new Set(approvals.map((a) => a.spender)));
  const { data: spenderMetadata, isLoading: isLoadingSpenderMetadata } =
    useSpenderMetadata(uniqueSpenders, scannedToBlock);

  const isAuditingContracts = approvals.length > 0 && isLoadingSpenderMetadata;

  if (isLoading || isAuditingContracts) {
    const current: ProgressStepKey = isLoading
      ? (stage as ProgressStepKey)
      : "auditing-contracts";
    return <ScanProgress current={current} />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400 sm:p-8">
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
      scannedToBlock,
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

  const scannedBlockSpan = scannedToBlock - scannedFromBlock;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <p className="text-sm text-white/40">Wallet Security Score</p>
        <p className="font-display mt-1 text-5xl font-semibold text-white">
          {health}/100
        </p>
        <p className="mt-3 text-sm text-white/50">
          {approvals.length === 0
            ? "No active token approvals found in the scanned range."
            : `${highCount} high risk, ${mediumCount} medium risk, ${lowCount} low risk, out of ${approvals.length} active approval${approvals.length === 1 ? "" : "s"}${contractWarnings > 0 ? `, plus ${contractWarnings} contract-level warning${contractWarnings === 1 ? "" : "s"}` : ""}.`}
        </p>
        <p className="mt-1 text-xs text-white/30">
          Scanned the last ~{formatBlockAge(scannedBlockSpan)} ({TRACKED_SYMBOLS})
          on Monad Mainnet. Live on every load, nothing cached or mocked.
          {isScanningDeeper &&
            " Still checking further back automatically: score may update as older approvals are found."}
        </p>
      </div>

      <OnchainScoreCard score={health} viewAddress={viewAddress} isOwnWallet={isOwnWallet} />

      {approvals.length > 0 && (
        <div className="flex flex-col gap-3">
          {approvals.map((approval, i) => (
            <ApprovalRow
              key={`${approval.token.address}-${approval.spender}`}
              approval={approval}
              risk={risks[i]}
              contractFlags={contractFlagsByIndex[i]}
              isOwnWallet={isOwnWallet}
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
          onClick={() => scanFurther()}
          disabled={isScanningDeeper}
          className="self-start rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/30 hover:text-white disabled:opacity-50"
        >
          {isScanningDeeper ? "Scanning..." : "Scan even further back"}
        </button>
      )}
    </div>
  );
}
