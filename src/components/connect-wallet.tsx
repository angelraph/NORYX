"use client";

import { useConnection, useConnect, useConnectors, useDisconnect } from "wagmi";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectWallet() {
  const { address, isConnected } = useConnection();
  const connectors = useConnectors();
  const { mutate: connect, isPending, error } = useConnect();
  const { mutate: disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">
          {shortenAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Connecting..." : `Connect ${connector.name}`}
          </button>
        ))}
      </div>
      {error && (
        <p className="max-w-xs text-xs text-red-400 sm:text-right">
          {error.message}
        </p>
      )}
    </div>
  );
}
