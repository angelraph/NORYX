// Same heuristic used by revoke.cash and similar tools: any allowance at or
// above 2^96 is already many orders of magnitude larger than any realistic
// token balance, so it is treated as an effectively unlimited approval.
export const UNLIMITED_THRESHOLD = 2n ** 96n;

export type RiskLevel = "low" | "medium" | "high";

export type ApprovalRisk = {
  level: RiskLevel;
  reasons: string[];
  recommendation: string;
};

export function assessApprovalRisk(params: {
  allowance: bigint;
  balance: bigint;
}): ApprovalRisk {
  const { allowance, balance } = params;

  const isUnlimited = allowance >= UNLIMITED_THRESHOLD;
  if (isUnlimited) {
    return {
      level: "high",
      reasons: [
        "Unlimited approval. This spender can move your entire balance, now or in the future.",
      ],
      recommendation:
        "Revoke this approval, or replace it with an exact-amount approval before your next transaction with this contract.",
    };
  }

  if (balance > 0n && allowance > balance * 10n) {
    return {
      level: "medium",
      reasons: [
        "Approved amount is far larger than your current balance of this token.",
      ],
      recommendation:
        "Lower this approval to roughly what you actually plan to spend with this contract.",
    };
  }

  return {
    level: "low",
    reasons: ["Approved amount is bounded and proportionate."],
    recommendation: "No action needed.",
  };
}

export function riskLevelPenalty(level: RiskLevel): number {
  if (level === "high") return 25;
  if (level === "medium") return 10;
  return 0;
}

export function computeWalletHealth(penalties: number[]): number {
  const total = penalties.reduce((sum, p) => sum + p, 0);
  return Math.max(0, 100 - total);
}

// Contract-risk checks are kept separate from approval-amount risk on
// purpose: they answer a different question ("is this spender itself
// trustworthy?") from "is this approval's size safe?", and each can be
// wrong or unknown independently of the other.
export type SpenderMetadata = {
  isContract: boolean;
  isVerified: boolean | null;
  deploymentBlock: bigint | null;
  deploymentBlockIsFloor: boolean;
};

export type ContractFlag = {
  label: string;
  tone: "warn" | "info";
  penalty: number;
};

// Roughly 14 hours at Monad's ~1s block time.
const NEW_CONTRACT_THRESHOLD_BLOCKS = 50_000n;

export function formatBlockAge(blocks: bigint): string {
  const seconds = Number(blocks); // ~1s per block on Monad Testnet
  if (seconds < 3600) return `~${Math.max(1, Math.round(seconds / 60))}m`;
  if (seconds < 86400) return `~${Math.round(seconds / 3600)}h`;
  return `~${Math.round(seconds / 86400)}d`;
}

export function computeContractFlags(
  metadata: SpenderMetadata | undefined,
  latestBlock: bigint | undefined,
): ContractFlag[] {
  if (!metadata) return [];
  const flags: ContractFlag[] = [];

  if (!metadata.isContract) {
    flags.push({
      label: "Spender is a wallet, not a contract",
      tone: "warn",
      penalty: 5,
    });
    return flags;
  }

  if (metadata.isVerified === true) {
    flags.push({ label: "Verified source", tone: "info", penalty: 0 });
  } else if (metadata.isVerified === false) {
    flags.push({ label: "Unverified contract", tone: "warn", penalty: 5 });
  }

  if (metadata.deploymentBlock !== null && latestBlock !== undefined) {
    const age = latestBlock - metadata.deploymentBlock;
    if (metadata.deploymentBlockIsFloor) {
      flags.push({
        label: `Established contract (${formatBlockAge(age)}+ old)`,
        tone: "info",
        penalty: 0,
      });
    } else if (age < NEW_CONTRACT_THRESHOLD_BLOCKS) {
      flags.push({
        label: `Deployed ${formatBlockAge(age)} ago`,
        tone: "warn",
        penalty: 10,
      });
    }
  }

  return flags;
}
