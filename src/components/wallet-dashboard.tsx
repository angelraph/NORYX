"use client";

import { useConnection, useBalance, useSwitchChain } from "wagmi";
import { formatUnits } from "viem";
import { monadTestnet } from "@/lib/chains";

export function WalletDashboard() {
  const { address, isConnected, chainId } = useConnection();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();

  const {
    data: balance,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: isConnected && !!address },
  });

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50">
        Connect your wallet to see your live balance on Monad Testnet.
      </div>
    );
  }

  const onWrongChain = chainId !== monadTestnet.id;

  if (onWrongChain) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <p className="text-amber-300">
          You&apos;re connected to chain {chainId}. Noryx reads live data from
          Monad Testnet.
        </p>
        <button
          onClick={() => switchChain({ chainId: monadTestnet.id })}
          disabled={isSwitching}
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-50"
        >
          {isSwitching ? "Switching..." : "Switch to Monad Testnet"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-8 sm:grid-cols-2">
      <div>
        <p className="text-sm text-white/40">Wallet</p>
        <p className="mt-1 break-all font-mono text-sm text-white">
          {address}
        </p>
      </div>
      <div>
        <p className="text-sm text-white/40">Native balance (live)</p>
        <p className="mt-1 text-2xl font-semibold text-white">
          {isBalanceLoading && "Loading..."}
          {isBalanceError && (
            <span className="text-red-400">Failed to fetch</span>
          )}
          {balance &&
            `${Number(formatUnits(balance.value, balance.decimals)).toLocaleString(
              undefined,
              { maximumFractionDigits: 4 },
            )} ${balance.symbol}`}
        </p>
      </div>
    </div>
  );
}
