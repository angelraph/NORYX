import type { Address, PublicClient } from "viem";
import { rpcCall } from "./rpc-utils";

// Monad Mainnet's public RPC only keeps ~1,928,000 blocks of historical
// eth_getCode state (confirmed by binary-searching the boundary directly —
// queries further back fail with "historical state that is not
// available"; this is a smaller window than testnet's ~5,000,000). Binary
// search is bounded to that window: if a contract already existed at the
// floor of the window, we report it as "at least this old" rather than
// claiming a precise (wrong) block.
const MAX_LOOKBACK_BLOCKS = 1_900_000n;

async function hasCodeAt(
  client: PublicClient,
  address: Address,
  blockNumber: bigint,
): Promise<boolean> {
  const code = await rpcCall(() => client.getCode({ address, blockNumber }));
  return !!code && code !== "0x";
}

export type DeploymentEstimate = {
  block: bigint;
  isFloor: boolean; // true = "existed at least since here", not exact
};

export async function findDeploymentBlock(
  client: PublicClient,
  address: Address,
  latestBlock: bigint,
): Promise<DeploymentEstimate> {
  const floor =
    latestBlock > MAX_LOOKBACK_BLOCKS ? latestBlock - MAX_LOOKBACK_BLOCKS : 0n;

  const existedAtFloor = await hasCodeAt(client, address, floor);
  if (existedAtFloor) {
    return { block: floor, isFloor: true };
  }

  let lo = floor;
  let hi = latestBlock;
  while (hi - lo > 1n) {
    const mid = lo + (hi - lo) / 2n;
    const exists = await hasCodeAt(client, address, mid);
    if (exists) hi = mid;
    else lo = mid;
  }
  return { block: hi, isFloor: false };
}
