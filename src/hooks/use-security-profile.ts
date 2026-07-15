"use client";

import { useEffect } from "react";
import { useConnection, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  SECURITY_PROFILE_ADDRESS,
  securityProfileAbi,
} from "@/lib/security-profile";
import { monadTestnet } from "@/lib/chains";

export type SecurityProfile = {
  blockUnlimitedApprovals: boolean;
  maxApprovalAmount: bigint;
  warnNewContracts: boolean;
  exists: boolean;
};

export function useSecurityProfile() {
  const { address } = useConnection();

  const readQuery = useReadContract({
    chainId: monadTestnet.id,
    address: SECURITY_PROFILE_ADDRESS,
    abi: securityProfileAbi,
    functionName: "getPreferences",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
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
      chainId: monadTestnet.id,
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
