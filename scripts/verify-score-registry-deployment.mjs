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

const artifact = JSON.parse(readFileSync(path.join(root, "src", "lib", "contracts", "score-registry-artifact.json"), "utf8"));
const deployment = JSON.parse(readFileSync(path.join(root, "src", "lib", "contracts", "score-registry-deployment.json"), "utf8"));
const address = deployment.address;

console.log("Contract:", address);

const before = await publicClient.readContract({
  address, abi: artifact.abi, functionName: "getScore", args: [account.address],
});
console.log("Before publish (expect exists=false):", before);

const hash = await walletClient.writeContract({
  address, abi: artifact.abi, functionName: "publishScore",
  args: [77],
});
console.log("publishScore tx:", hash);
await publicClient.waitForTransactionReceipt({ hash });

const after = await publicClient.readContract({
  address, abi: artifact.abi, functionName: "getScore", args: [account.address],
});
console.log("After publish (expect score=77, exists=true):", after);

const other = await publicClient.readContract({
  address, abi: artifact.abi, functionName: "getScore",
  args: ["0x000000000000000000000000000000000000dEaD"],
});
console.log("Different address, never published (expect exists=false):", other);

const ok = after[0] === 77 && after[2] === true && other[2] === false;
console.log(ok ? "VERIFICATION PASSED" : "VERIFICATION FAILED");
if (!ok) process.exit(1);
