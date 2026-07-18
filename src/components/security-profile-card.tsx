"use client";

import { useState } from "react";
import { useConnection } from "wagmi";
import { useSecurityProfile, type SecurityProfile } from "@/hooks/use-security-profile";
import { monad } from "@/lib/chains";

function ProfileForm({
  initialProfile,
  save,
  isSaving,
  isSaved,
  error,
}: {
  initialProfile: SecurityProfile | undefined;
  save: (prefs: {
    blockUnlimitedApprovals: boolean;
    maxApprovalAmount: bigint;
    warnNewContracts: boolean;
  }) => void;
  isSaving: boolean;
  isSaved: boolean;
  error: Error | null;
}) {
  const [blockUnlimited, setBlockUnlimited] = useState(
    initialProfile?.exists ? initialProfile.blockUnlimitedApprovals : true,
  );
  const [maxAmount, setMaxAmount] = useState(
    initialProfile?.exists ? initialProfile.maxApprovalAmount.toString() : "1000000000",
  );
  const [warnNewContracts, setWarnNewContracts] = useState(
    initialProfile?.exists ? initialProfile.warnNewContracts : true,
  );

  return (
    <div className="mt-4 flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={blockUnlimited}
          onChange={(e) => setBlockUnlimited(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-black"
        />
        Flag unlimited approvals as a policy violation
      </label>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={warnNewContracts}
          onChange={(e) => setWarnNewContracts(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-black"
        />
        Warn me about unfamiliar contracts (coming soon)
      </label>

      <label className="flex flex-col gap-1 text-sm text-white/70">
        Max approval amount (smallest unit, applied per token)
        <input
          type="text"
          inputMode="numeric"
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value.replace(/[^0-9]/g, ""))}
          className="w-48 rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm text-white"
        />
      </label>

      <button
        onClick={() =>
          save({
            blockUnlimitedApprovals: blockUnlimited,
            maxApprovalAmount: BigInt(maxAmount || "0"),
            warnNewContracts,
          })
        }
        disabled={isSaving}
        className="mt-1 self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
      >
        {isSaving ? "Saving on-chain..." : "Save Preferences"}
      </button>

      {isSaved && <p className="text-xs text-emerald-400">Saved on-chain.</p>}
      {error && <p className="text-xs text-red-400">{error.message}</p>}
    </div>
  );
}

export function SecurityProfileCard() {
  const { isConnected, chainId } = useConnection();
  const { profile, isLoadingProfile, save, isSaving, isSaved, error } =
    useSecurityProfile();

  if (!isConnected || chainId !== monad.id) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <p className="font-display text-sm font-medium text-white">
        Your Security Profile
      </p>
      <p className="mt-1 text-xs text-white/40">
        Saved on-chain in the SecurityProfile contract, checked against every
        scan below.
      </p>

      {isLoadingProfile ? (
        <p className="mt-4 text-sm text-white/40">Loading your saved preferences...</p>
      ) : (
        <ProfileForm
          initialProfile={profile}
          save={save}
          isSaving={isSaving}
          isSaved={isSaved}
          error={error}
        />
      )}
    </div>
  );
}
