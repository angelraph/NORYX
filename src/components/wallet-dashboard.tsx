"use client";

import { useConnection, useBalance, useSwitchChain } from "wagmi";
import { formatUnits, type Address } from "viem";
import { monad } from "@/lib/chains";

export function WalletDashboard({
  viewAddress,
  isOwnWallet,
}: {
  viewAddress: Address;
  isOwnWallet: boolean;
}) {
  const { chainId } = useConnection();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();

  const {
    data: balance,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useBalance({
    address: viewAddress,
    chainId: monad.id,
  });

  const blockingWrongChain = isOwnWallet && chainId !== monad.id;

  return (
    <div className="flex flex-col gap-4">
      {blockingWrongChain && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center sm:p-8">
          <p className="text-amber-300">
            You&apos;re connected to chain {chainId}. Revoking, saving a
            policy, or publishing a score requires signing on Monad Mainnet.
          </p>
          <button
            onClick={() => switchChain({ chainId: monad.id })}
            disabled={isSwitching}
            className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-50"
          >
            {isSwitching ? "Switching..." : "Switch to Monad Mainnet"}
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-linear-to-r from-monad-purple/40 to-monad-cyan/40 p-px">
        <div className="grid gap-4 rounded-[15px] bg-black p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <p className="text-sm text-white/40">Wallet</p>
            <p className="mt-1 break-all font-mono text-sm text-white">
              {viewAddress}
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
      </div>
    </div>
  );
}
