import type { Address } from "viem";

// Deployed via `node scripts/deploy-contract.mjs ScoreRegistry`, see
// src/lib/contracts/score-registry-deployment.json for tx/timestamp.
// Publishes a wallet's Wallet Security Score on-chain so it's a portable
// fact any Monad contract can read, not just a number in Noryx's own UI.
export const SCORE_REGISTRY_ADDRESS: Address =
  "0x61b7de677d6548df8df1f73e107b69d67eee606b";

export const scoreRegistryAbi = [
  {
    type: "function",
    name: "publishScore",
    stateMutability: "nonpayable",
    inputs: [{ name: "score", type: "uint8" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getScore",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "score", type: "uint8" },
      { name: "timestamp", type: "uint64" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "ScorePublished",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "score", type: "uint8", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
    ],
  },
] as const;
