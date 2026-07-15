import solc from "solc";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const contractPath = path.join(root, "contracts", "SecurityProfile.sol");
const source = readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "SecurityProfile.sol": { content: source },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode.object"] },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === "error");
  for (const e of output.errors) console.log(e.formattedMessage);
  if (fatal.length > 0) process.exit(1);
}

const contract = output.contracts["SecurityProfile.sol"]["SecurityProfile"];
const artifact = {
  abi: contract.abi,
  bytecode: `0x${contract.evm.bytecode.object}`,
};

const outDir = path.join(root, "src", "lib", "contracts");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "security-profile-artifact.json"),
  JSON.stringify(artifact, null, 2),
);

console.log("Compiled SecurityProfile.sol ->", path.join(outDir, "security-profile-artifact.json"));
console.log("Bytecode length:", contract.evm.bytecode.object.length / 2, "bytes");
