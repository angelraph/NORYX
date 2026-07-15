"use client";

import { useEffect } from "react";
import type { Address } from "viem";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi } from "@/lib/erc20-abi";
import { monadTestnet } from "@/lib/chains";

export function useRevokeApproval() {
  const queryClient = useQueryClient();
  const { mutate, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      queryClient.invalidateQueries({ queryKey: ["approval-scan"] });
    }
  }, [isConfirmed, queryClient]);

  function revoke(token: Address, spender: Address) {
    mutate({
      chainId: monadTestnet.id,
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, 0n],
    });
  }

  return {
    revoke,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}
