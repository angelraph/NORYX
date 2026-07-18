"use client";

import { useEffect } from "react";
import { useConnection, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  SCORE_REGISTRY_ADDRESS,
  scoreRegistryAbi,
} from "@/lib/score-registry";
import { monad } from "@/lib/chains";

export type PublishedScore = {
  score: number;
  timestamp: bigint;
  exists: boolean;
};

export function useScoreRegistry() {
  const { address } = useConnection();

  const readQuery = useReadContract({
    chainId: monad.id,
    address: SCORE_REGISTRY_ADDRESS,
    abi: scoreRegistryAbi,
    functionName: "getScore",
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

  function publish(score: number) {
    mutate({
      chainId: monad.id,
      address: SCORE_REGISTRY_ADDRESS,
      abi: scoreRegistryAbi,
      functionName: "publishScore",
      args: [score],
    });
  }

  const raw = readQuery.data;
  const publishedScore: PublishedScore | undefined = raw
    ? { score: raw[0], timestamp: raw[1], exists: raw[2] }
    : undefined;

  return {
    publishedScore,
    isLoadingPublishedScore: readQuery.isLoading,
    publish,
    isPublishing: isPending || isConfirming,
    isPublished: isConfirmed,
    error,
  };
}
