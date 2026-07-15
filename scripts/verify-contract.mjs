import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import solc from "solc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const source = readFileSync(path.join(root, "contracts", "SecurityProfile.sol"), "utf8");
const deployment = JSON.parse(
  readFileSync(path.join(root, "src", "lib", "contracts", "security-profile-deployment.json"), "utf8"),
);

const longVersion = solc.version(); // e.g. "0.8.24+commit.e11b9ed9.Emscripten.clang"
const compilerVersion = longVersion.split(".Emscripten")[0].split(".clang")[0];

const stdJsonInput = {
  language: "Solidity",
  sources: {
    "contracts/SecurityProfile.sol": { content: source },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode.object"] },
    },
  },
};

const body = {
  stdJsonInput,
  compilerVersion,
  contractIdentifier: "contracts/SecurityProfile.sol:SecurityProfile",
  creationTransactionHash: deployment.deployTx,
};

const base = "https://sourcify-api-monad.blockvision.org";
const url = `${base}/v2/verify/${deployment.chainId}/${deployment.address}`;

console.log("POST", url);
console.log("compilerVersion:", compilerVersion);

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const json = await res.json();
console.log("Status:", res.status);
console.log(JSON.stringify(json, null, 2));

if (json.verificationId) {
  console.log("\nPolling verification status...");
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(`${base}/v2/verify/${json.verificationId}`);
    const statusJson = await statusRes.json();
    console.log(`  [${i}]`, JSON.stringify(statusJson.isJobCompleted !== undefined ? {
      isJobCompleted: statusJson.isJobCompleted,
      error: statusJson.error,
      contract: statusJson.contract?.match,
    } : statusJson));
    if (statusJson.isJobCompleted) break;
  }
}
