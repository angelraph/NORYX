import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const contractName = process.argv[2] || "SecurityProfile";
const kebabName = contractName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const constructorArgs = process.argv[3] ? JSON.parse(process.argv[3]) : [];

const envContent = readFileSync(path.join(root, ".env.local"), "utf8");
const privateKey = envContent.match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]+)/)[1];
const account = privateKeyToAccount(privateKey);

const monad = {
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
};

const publicClient = createPublicClient({ chain: monad, transport: http() });
const walletClient = createWalletClient({ account, chain: monad, transport: http() });

const artifact = JSON.parse(
  readFileSync(path.join(root, "src", "lib", "contracts", `${kebabName}-artifact.json`), "utf8"),
);

console.log("Deploying from:", account.address);
console.log("Contract:", contractName);
console.log("Constructor args:", constructorArgs);

const hash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  args: constructorArgs,
});
console.log("Deploy tx:", hash);

const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("Status:", receipt.status);
console.log("Contract address:", receipt.contractAddress);

if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("Deployment failed.");
  process.exit(1);
}

// Sanity check: the deployed code should be non-trivial and callable.
const code = await publicClient.getCode({ address: receipt.contractAddress });
console.log("Deployed bytecode length:", (code.length - 2) / 2, "bytes");

const deploymentInfo = {
  address: receipt.contractAddress,
  deployTx: hash,
  chainId: monad.id,
  constructorArgs,
  deployedAt: new Date().toISOString(),
};
writeFileSync(
  path.join(root, "src", "lib", "contracts", `${kebabName}-deployment.json`),
  JSON.stringify(deploymentInfo, null, 2),
);
console.log("Saved deployment info.");
