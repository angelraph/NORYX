import type { Address } from "viem";

export type TrackedToken = {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
};

// Sourced from the official Monad token list (monad-crypto/token-list,
// tokenlist-testnet.json) and independently confirmed live on Monad Testnet
// via eth_getCode + symbol().
export const TRACKED_TOKENS: TrackedToken[] = [
  {
    address: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
  },
  {
    address: "0x45477f4709771331db81944A5E20eF95Bc7BA2D7",
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
  },
  {
    address: "0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541",
    name: "Wrapped MON",
    symbol: "WMON",
    decimals: 18,
  },
];
