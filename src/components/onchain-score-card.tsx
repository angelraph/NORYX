"use client";

import type { Address } from "viem";
import { useScoreRegistry } from "@/hooks/use-score-registry";
import { useScoreGatedDemo } from "@/hooks/use-score-gated-demo";
import { MIN_SCORE } from "@/lib/score-gated-demo";

function formatSecondsAgo(timestamp: bigint): string {
  const seconds = Math.max(0, Date.now() / 1000 - Number(timestamp));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

export function OnchainScoreCard({
  score,
  viewAddress,
  isOwnWallet,
}: {
  score: number;
  viewAddress: Address;
  isOwnWallet: boolean;
}) {
  const {
    publishedScore,
    isLoadingPublishedScore,
    publish,
    isPublishing,
    isPublished,
    error: publishError,
  } = useScoreRegistry(viewAddress);

  const {
    attempt,
    isPending: isGatedPending,
    isConfirming: isGatedConfirming,
    isConfirmed: isGatedConfirmed,
    error: gatedError,
  } = useScoreGatedDemo();

  const isStale = !isLoadingPublishedScore && publishedScore?.exists && publishedScore.score !== score;
  const canPublish =
    isOwnWallet && !isLoadingPublishedScore && (!publishedScore?.exists || isStale);
  const gatedBusy = isGatedPending || isGatedConfirming;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <p className="font-display text-sm font-medium text-white">
        On-Chain Score Attestation
      </p>
      <p className="mt-1 text-xs text-white/40">
        Your Wallet Security Score above only lives in this tab until you
        publish it. Publishing writes it to the ScoreRegistry contract, where
        it becomes a portable fact any other Monad contract can check &mdash;
        not just a number a UI shows you once.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isLoadingPublishedScore ? (
          <p className="text-sm text-white/40">Checking your published attestation...</p>
        ) : publishedScore?.exists ? (
          <p className="text-sm text-white/70">
            Published:{" "}
            <span className="font-mono text-white">{publishedScore.score}/100</span>{" "}
            <span className="text-white/40">
              ({formatSecondsAgo(publishedScore.timestamp)}
              {isStale ? ", out of date" : ""})
            </span>
          </p>
        ) : (
          <p className="text-sm text-white/40">No score published yet.</p>
        )}

        {canPublish && (
          <button
            onClick={() => publish(score)}
            disabled={isPublishing}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {isPublishing ? "Publishing on-chain..." : `Publish score (${score}/100)`}
          </button>
        )}
      </div>
      {!isOwnWallet && !publishedScore?.exists && !isLoadingPublishedScore && (
        <p className="mt-2 text-xs text-white/30">
          Connect this exact wallet to publish its score.
        </p>
      )}
      {isPublished && (
        <p className="mt-2 text-xs text-emerald-400">Published on-chain.</p>
      )}
      {publishError && (
        <p className="mt-2 text-xs text-red-400">{publishError.message}</p>
      )}

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-sm text-white/70">
          Composability demo: a second contract, deployed independently,
          reads your published attestation and only lets wallets scoring{" "}
          {MIN_SCORE}+ through.
        </p>
        <button
          onClick={() => attempt()}
          disabled={gatedBusy || !isOwnWallet}
          className="mt-3 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-monad-purple/50 hover:text-white disabled:opacity-50"
        >
          {isGatedConfirmed
            ? "Access granted"
            : isGatedConfirming
              ? "Confirming..."
              : isGatedPending
                ? "Confirm in wallet..."
                : "Try gated action"}
        </button>
        {!isOwnWallet && (
          <p className="mt-2 text-xs text-white/30">
            Connect this exact wallet to try the gated action &mdash; it can
            only be called by the address whose score is being checked.
          </p>
        )}
        {isGatedConfirmed && (
          <p className="mt-2 text-xs text-emerald-400">
            Access granted &mdash; verified on-chain against your published
            score, by a contract Noryx doesn&apos;t control.
          </p>
        )}
        {gatedError && (
          <p className="mt-2 text-xs text-red-400">{gatedError.message}</p>
        )}
      </div>
    </div>
  );
}
