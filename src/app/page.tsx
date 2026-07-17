"use client";

import { useConnection } from "wagmi";
import { ConnectWallet } from "@/components/connect-wallet";
import { LandingHero } from "@/components/landing-hero";
import { WalletDashboard } from "@/components/wallet-dashboard";
import { SecurityProfileCard } from "@/components/security-profile-card";
import { RiskReport } from "@/components/risk-report";

export default function Home() {
  const { isConnected } = useConnection();

  return (
    <div className="flex flex-1 flex-col bg-black text-white">
      <header className="flex flex-col gap-4 border-b border-white/10 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div>
          <p className="text-lg font-semibold tracking-tight">Noryx</p>
          <p className="text-xs text-white/40">
            Live onchain wallet security audit.
          </p>
        </div>
        {isConnected && <ConnectWallet />}
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-10 sm:py-12">
        {isConnected ? (
          <>
            <WalletDashboard />
            <SecurityProfileCard />
            <RiskReport />
          </>
        ) : (
          <LandingHero />
        )}
      </main>
    </div>
  );
}
