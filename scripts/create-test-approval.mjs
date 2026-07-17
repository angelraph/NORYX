// Dev-only utility: creates one real, live token approval on Monad Testnet
// so the app has something to detect and revoke while testing/demoing.
// Not part of the shipped app — run manually, never imported by src/.
//
// Usage:
//   1. Add TEST_WALLET_PRIVATE_KEY=0x... to .env.local (the private key of
//      the SAME wallet you connect with in the browser). That wallet needs
//      a little testnet MON for gas: https://faucet.monad.xyz
//   2. node scripts/create-test-approval.mjs
//   3. Reload the app and reconnect that wallet — the new approval shows up
//      in the fast first pass (it's recent, no need to wait for auto-scan).
//
// Optional args: node scripts/create-test-approval.mjs [tokenSymbol] [spender] [amount]
//   tokenSymbol defaults to USDC, spender defaults to the deployed
//   SecurityProfile contract (a real, verified, harmless contract you
//   already own), amount defaults to "unlimited" (max uint256, so it shows
//   up as a high-risk row).

import { createPublicClient, createWalletClient, http, maxUint256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const envContent = readFileSync(path.join(root, ".env.local"), "utf8");
const match = envContent.match(/TEST_WALLET_PRIVATE_KEY=(0x)?([0-9a-fA-F]{64})/);
if (!match) {
  console.error(
    "Add TEST_WALLET_PRIVATE_KEY=... to .env.local first (the private key of the wallet you test with in the browser, with or without a 0x prefix).",
  );
  process.exit(1);
}
const account = privateKeyToAccount(`0x${match[2]}`);

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
};

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

const TRACKED_TOKENS = {
  USDC: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
  WETH: "0x45477f4709771331db81944A5E20eF95Bc7BA2D7",
  WMON: "0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541",
};

const deployment = JSON.parse(
  readFileSync(
    path.join(root, "src", "lib", "contracts", "security-profile-deployment.json"),
    "utf8",
  ),
);

const [, , tokenArg, spenderArg, amountArg] = process.argv;
const tokenSymbol = tokenArg ?? "USDC";
const tokenAddress = TRACKED_TOKENS[tokenSymbol];
if (!tokenAddress) {
  console.error(`Unknown token "${tokenSymbol}". Options: ${Object.keys(TRACKED_TOKENS).join(", ")}`);
  process.exit(1);
}
const spender = spenderArg ?? deployment.address;
const amount = amountArg ? BigInt(amountArg) : maxUint256;

const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http() });

console.log("Wallet:", account.address);
console.log("Token:", tokenSymbol, tokenAddress);
console.log("Spender:", spender);
console.log("Amount:", amount === maxUint256 ? "unlimited (max uint256)" : amount.toString());

const hash = await walletClient.writeContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: "approve",
  args: [spender, amount],
});
console.log("Tx:", hash);

const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("Status:", receipt.status);

if (receipt.status !== "success") {
  console.error("Approval transaction failed.");
  process.exit(1);
}

console.log("\nDone. Reconnect this wallet in the app, it should show up as a live approval within a few seconds.");
