import type { Address } from "viem";

// Deployed via scripts/deploy-contract.mjs, see
// src/lib/contracts/security-profile-deployment.json for tx/timestamp.
export const SECURITY_PROFILE_ADDRESS: Address =
  "0x884EEa8281C15c3516f10Cc6864EBBaA453AF9d8";

export const securityProfileAbi = [
  {
    type: "function",
    name: "savePreferences",
    stateMutability: "nonpayable",
    inputs: [
      { name: "blockUnlimitedApprovals", type: "bool" },
      { name: "maxApprovalAmount", type: "uint256" },
      { name: "warnNewContracts", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getPreferences",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "blockUnlimitedApprovals", type: "bool" },
      { name: "maxApprovalAmount", type: "uint256" },
      { name: "warnNewContracts", type: "bool" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "PreferencesSaved",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "blockUnlimitedApprovals", type: "bool", indexed: false },
      { name: "maxApprovalAmount", type: "uint256", indexed: false },
      { name: "warnNewContracts", type: "bool", indexed: false },
    ],
  },
] as const;
