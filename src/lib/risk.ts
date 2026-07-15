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
        "Unlimited approval — this spender can move your entire balance, now or in the future.",
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

export function computeWalletHealth(risks: RiskLevel[]): number {
  const penalty = risks.reduce((total, level) => {
    if (level === "high") return total + 25;
    if (level === "medium") return total + 10;
    return total;
  }, 0);
  return Math.max(0, 100 - penalty);
}
