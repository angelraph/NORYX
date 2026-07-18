"use client";

import { useEffect } from "react";
import type { Address } from "viem";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  SECURITY_PROFILE_ADDRESS,
  securityProfileAbi,
} from "@/lib/security-profile";
import { monad } from "@/lib/chains";

export type SecurityProfile = {
  blockUnlimitedApprovals: boolean;
  maxApprovalAmount: bigint;
  warnNewContracts: boolean;
  exists: boolean;
};

export function useSecurityProfile(viewAddress: Address | undefined) {
  const readQuery = useReadContract({
    chainId: monad.id,
    address: SECURITY_PROFILE_ADDRESS,
    abi: securityProfileAbi,
    functionName: "getPreferences",
    args: viewAddress ? [viewAddress] : undefined,
    query: { enabled: !!viewAddress },
  });

  const { mutate, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      readQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  function save(prefs: {
    blockUnlimitedApprovals: boolean;
    maxApprovalAmount: bigint;
    warnNewContracts: boolean;
  }) {
    mutate({
      chainId: monad.id,
      address: SECURITY_PROFILE_ADDRESS,
      abi: securityProfileAbi,
      functionName: "savePreferences",
      args: [
        prefs.blockUnlimitedApprovals,
        prefs.maxApprovalAmount,
        prefs.warnNewContracts,
      ],
    });
  }

  const raw = readQuery.data;
  const profile: SecurityProfile | undefined = raw
    ? {
        blockUnlimitedApprovals: raw[0],
        maxApprovalAmount: raw[1],
        warnNewContracts: raw[2],
        exists: raw[3],
      }
    : undefined;

  return {
    profile,
    isLoadingProfile: readQuery.isLoading,
    save,
    isSaving: isPending || isConfirming,
    isSaved: isConfirmed,
    error,
  };
}
