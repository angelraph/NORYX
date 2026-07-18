"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SCORE_GATED_DEMO_ADDRESS, scoreGatedDemoAbi } from "@/lib/score-gated-demo";
import { monad } from "@/lib/chains";

export function useScoreGatedDemo() {
  const { mutate, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  function attempt() {
    mutate({
      chainId: monad.id,
      address: SCORE_GATED_DEMO_ADDRESS,
      abi: scoreGatedDemoAbi,
      functionName: "attemptGatedAction",
    });
  }

  return {
    attempt,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
  };
}
