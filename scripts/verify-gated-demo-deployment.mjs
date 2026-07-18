import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const envContent = readFileSync(path.join(root, ".env.local"), "utf8");
const privateKey = envContent.match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]+)/)[1];
const account = privateKeyToAccount(privateKey);

const monad = {
  id: 143,
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
};
const publicClient = createPublicClient({ chain: monad, transport: http() });
const walletClient = createWalletClient({ account, chain: monad, transport: http() });

const gatedArtifact = JSON.parse(readFileSync(path.join(root, "src", "lib", "contracts", "score-gated-demo-artifact.json"), "utf8"));
const gatedDeployment = JSON.parse(readFileSync(path.join(root, "src", "lib", "contracts", "score-gated-demo-deployment.json"), "utf8"));
const registryArtifact = JSON.parse(readFileSync(path.join(root, "src", "lib", "contracts", "score-registry-artifact.json"), "utf8"));
const registryDeployment = JSON.parse(readFileSync(path.join(root, "src", "lib", "contracts", "score-registry-deployment.json"), "utf8"));

console.log("ScoreGatedDemo:", gatedDeployment.address);
console.log("minScore:", await publicClient.readContract({
  address: gatedDeployment.address, abi: gatedArtifact.abi, functionName: "minScore",
}));

// Publish a below-threshold score, confirm attemptGatedAction reverts.
const lowHash = await walletClient.writeContract({
  address: registryDeployment.address, abi: registryArtifact.abi, functionName: "publishScore",
  args: [10],
});
await publicClient.waitForTransactionReceipt({ hash: lowHash });

let revertedBelowThreshold = false;
try {
  await publicClient.simulateContract({
    account, address: gatedDeployment.address, abi: gatedArtifact.abi, functionName: "attemptGatedAction",
  });
} catch (e) {
  revertedBelowThreshold = /below required threshold/.test(e.message);
  console.log("Below-threshold call reverted as expected:", revertedBelowThreshold);
}

// Publish an above-threshold score, confirm attemptGatedAction succeeds.
const highHash = await walletClient.writeContract({
  address: registryDeployment.address, abi: registryArtifact.abi, functionName: "publishScore",
  args: [90],
});
await publicClient.waitForTransactionReceipt({ hash: highHash });

const gatedHash = await walletClient.writeContract({
  address: gatedDeployment.address, abi: gatedArtifact.abi, functionName: "attemptGatedAction",
});
const gatedReceipt = await publicClient.waitForTransactionReceipt({ hash: gatedHash });
console.log("Above-threshold call status:", gatedReceipt.status);

const ok = revertedBelowThreshold && gatedReceipt.status === "success";
console.log(ok ? "VERIFICATION PASSED" : "VERIFICATION FAILED");
if (!ok) process.exit(1);
