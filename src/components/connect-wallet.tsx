"use client";

import { useEffect, useRef, useState } from "react";
import { useConnection, useConnect, useConnectors, useDisconnect } from "wagmi";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectWallet() {
  const { address, isConnected } = useConnection();
  const connectors = useConnectors();
  const { mutate: connect, isPending, error } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // wagmi's EIP-6963 discovery can occasionally announce the same wallet
  // twice (e.g. once via a legacy window.ethereum shim, once via the
  // standard announceProvider event) — dedupe by name so it only appears
  // once in the list.
  const uniqueConnectors = connectors.filter(
    (connector, i) => connectors.findIndex((c) => c.name === connector.name) === i,
  );

  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

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
    <div ref={panelRef} className="relative flex flex-col items-start gap-2 sm:items-end">
      <button
        onClick={() => setIsOpen((o) => !o)}
        disabled={isPending}
        className="rounded-full bg-linear-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl shadow-black/50">
          {uniqueConnectors.length === 0 ? (
            <p className="px-4 py-3 text-sm text-white/40">
              No wallet extensions detected.
            </p>
          ) : (
            uniqueConnectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  connect({ connector });
                  setIsOpen(false);
                }}
                disabled={isPending}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white transition hover:bg-linear-to-r hover:from-violet-500/15 hover:to-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connector.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={connector.icon} alt="" className="h-5 w-5 shrink-0 rounded" />
                )}
                {connector.name}
              </button>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="max-w-xs text-xs text-red-400 sm:text-right">
          {error.message}
        </p>
      )}
    </div>
  );
}
