"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address, PublicClient } from "viem";
import { monad } from "@/lib/chains";
import { rpcCall } from "@/lib/rpc-utils";
import { checkContractVerified } from "@/lib/sourcify";
import { findDeploymentBlock } from "@/lib/contract-age";
import type { SpenderMetadata } from "@/lib/risk";

async function loadSpenderMetadata(
  client: PublicClient,
  spender: Address,
  latestBlock: bigint,
): Promise<SpenderMetadata> {
  const code = await rpcCall(() => client.getCode({ address: spender }));
  const isContract = !!code && code !== "0x";

  if (!isContract) {
    return {
      isContract: false,
      isVerified: null,
      deploymentBlock: null,
      deploymentBlockIsFloor: false,
    };
  }

  const [isVerified, deployment] = await Promise.all([
    checkContractVerified(monad.id, spender),
    findDeploymentBlock(client, spender, latestBlock),
  ]);

  return {
    isContract: true,
    isVerified,
    deploymentBlock: deployment.block,
    deploymentBlockIsFloor: deployment.isFloor,
  };
}

export function useSpenderMetadata(spenders: Address[], latestBlock: bigint | undefined) {
  const publicClient = usePublicClient({ chainId: monad.id });
  const sortedKey = [...spenders].sort().join(",");

  return useQuery({
    queryKey: ["spender-metadata", sortedKey, latestBlock?.toString()],
    enabled: !!publicClient && spenders.length > 0 && !!latestBlock,
    staleTime: 60_000,
    queryFn: async () => {
      const client = publicClient as PublicClient;
      const results = await Promise.all(
        spenders.map((spender) =>
          loadSpenderMetadata(client, spender, latestBlock as bigint),
        ),
      );
      const map = new Map<Address, SpenderMetadata>();
      spenders.forEach((spender, i) => map.set(spender, results[i]));
      return map;
    },
  });
}
