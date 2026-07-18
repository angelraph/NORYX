import type { Address } from "viem";

// Deployed via
// `node scripts/deploy-contract.mjs ScoreGatedDemo '["<ScoreRegistry address>",70]'`,
// see src/lib/contracts/score-gated-demo-deployment.json for tx/timestamp.
// A toy contract that only lets a wallet through if it has a published
// ScoreRegistry attestation at or above MIN_SCORE - proves the score is
// a reusable on-chain fact, not just a UI number.
export const SCORE_GATED_DEMO_ADDRESS: Address =
  "0xa9ead41e9b1a5e2e1b388a5a6e4c7d450f9f73ab";

export const MIN_SCORE = 70;

export const scoreGatedDemoAbi = [
  {
    type: "function",
    name: "attemptGatedAction",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "granted", type: "bool" }],
  },
  {
    type: "function",
    name: "minScore",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "event",
    name: "AccessGranted",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "score", type: "uint8", indexed: false },
    ],
  },
] as const;
