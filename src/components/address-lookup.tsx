"use client";

import { useState } from "react";
import { isAddress, type Address } from "viem";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AddressLookup({
  manualAddress,
  connectedAddress,
  isOwnWallet,
  onLookup,
  onClear,
}: {
  manualAddress: Address | undefined;
  connectedAddress: Address | undefined;
  isOwnWallet: boolean;
  onLookup: (address: Address) => void;
  onClear: () => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = input.trim();
    if (!isAddress(trimmed)) {
      setError("Not a valid address.");
      return;
    }
    setError(null);
    onLookup(trimmed);
    setInput("");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Look up any wallet address (no connection needed)"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm text-white placeholder:font-sans placeholder:text-white/30"
        />
        <button
          onClick={submit}
          className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-monad-purple/50 hover:text-white"
        >
          View
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {manualAddress && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-semibold uppercase tracking-wide text-amber-300">
            Viewing (read-only)
          </span>
          <span className="font-mono text-white/50">
            {shortenAddress(manualAddress)}
          </span>
          {connectedAddress && !isOwnWallet && (
            <button
              onClick={onClear}
              className="ml-auto text-white/40 underline decoration-white/20 underline-offset-2 hover:text-white"
            >
              Use my connected wallet
            </button>
          )}
        </div>
      )}
    </div>
  );
}
