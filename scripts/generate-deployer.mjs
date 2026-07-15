import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");

if (existsSync(envPath)) {
  const existing = readFileSync(envPath, "utf8");
  const match = existing.match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]+)/);
  if (match) {
    const account = privateKeyToAccount(match[1]);
    console.log("Deployer already exists:", account.address);
    process.exit(0);
  }
}

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

const line = `DEPLOYER_PRIVATE_KEY=${privateKey}\n`;
if (existsSync(envPath)) {
  writeFileSync(envPath, readFileSync(envPath, "utf8") + line);
} else {
  writeFileSync(envPath, line);
}

console.log("Generated new burner deployer wallet.");
console.log("Address (fund this with testnet MON):", account.address);
