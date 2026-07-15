"use client";

import { useState } from "react";
import { type Address, isAddress, maxUint256, parseUnits } from "viem";
import { useConnection, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRACKED_TOKENS } from "@/lib/tokens";
import { erc20Abi } from "@/lib/erc20-abi";
import { monadTestnet } from "@/lib/chains";

// Temporary dev-only utility to generate real test approvals against
// Monad Testnet so the scanner can be verified end-to-end. Remove before
// hackathon submission — it is not part of the Noryx product surface.
export function DevApprovalTool() {
  const { address, isConnected, chainId } = useConnection();
  const [tokenIndex, setTokenIndex] = useState(0);
  const [spender, setSpender] = useState("");
  const { mutate, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  if (!isConnected || chainId !== monadTestnet.id) return null;

  const token = TRACKED_TOKENS[tokenIndex];
  const spenderAddress = (spender || address) as Address | undefined;
  const spenderIsValid = !!spenderAddress && isAddress(spenderAddress);

  function approve(amount: bigint) {
    if (!spenderIsValid || !spenderAddress) return;
    mutate({
      chainId: monadTestnet.id,
      address: token.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [spenderAddress, amount],
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-fuchsia-500/40 bg-fuchsia-500/[0.03] p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-400">
        Dev tool — real testnet transaction, remove before submission
      </p>
      <p className="mt-1 text-sm text-white/50">
        Grants a real ERC-20 approval so the scanner above has something to
        find. This is scaffolding for testing, not a Noryx feature.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-sm text-white/60">
          Token
          <select
            value={tokenIndex}
            onChange={(e) => setTokenIndex(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white"
          >
            {TRACKED_TOKENS.map((t, i) => (
              <option key={t.address} value={i}>
                {t.symbol}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm text-white/60">
          Spender address
          <input
            value={spender}
            onChange={(e) => setSpender(e.target.value)}
            placeholder={address}
            className="rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm text-white placeholder:text-white/30"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => approve(parseUnits("1", token.decimals))}
          disabled={!spenderIsValid || isPending || isConfirming}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
        >
          Approve 1 {token.symbol}
        </button>
        <button
          onClick={() => approve(maxUint256)}
          disabled={!spenderIsValid || isPending || isConfirming}
          className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          Approve Unlimited {token.symbol}
        </button>
      </div>

      {!spenderIsValid && spender.length > 0 && (
        <p className="mt-2 text-xs text-red-400">Not a valid address.</p>
      )}
      {isPending && (
        <p className="mt-2 text-xs text-white/50">Confirm in your wallet...</p>
      )}
      {isConfirming && (
        <p className="mt-2 text-xs text-white/50">
          Waiting for confirmation... {hash}
        </p>
      )}
      {isConfirmed && (
        <p className="mt-2 text-xs text-emerald-400">
          Confirmed. Reload the scan above to see it.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error.message}</p>
      )}
    </div>
  );
}
