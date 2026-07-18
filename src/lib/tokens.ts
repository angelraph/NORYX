import type { Address } from "viem";

export type TrackedToken = {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
};

// Sourced from the official Monad token list (monad-crypto/token-list,
// tokenlist-mainnet.json) and independently confirmed live on Monad Mainnet
// via eth_getCode.
export const TRACKED_TOKENS: TrackedToken[] = [
  {
    address: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  {
    address: "0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242",
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
  },
  {
    address: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
    name: "Wrapped MON",
    symbol: "WMON",
    decimals: 18,
  },
];
