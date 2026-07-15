import { ConnectWallet } from "@/components/connect-wallet";
import { WalletDashboard } from "@/components/wallet-dashboard";
import { SecurityProfileCard } from "@/components/security-profile-card";
import { RiskReport } from "@/components/risk-report";
import { DevApprovalTool } from "@/components/dev-approval-tool";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-black text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-10">
        <div>
          <p className="text-lg font-semibold tracking-tight">Noryx</p>
          <p className="text-xs text-white/40">
            Know exactly what you&apos;re signing.
          </p>
        </div>
        <ConnectWallet />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12 sm:px-10">
        <WalletDashboard />
        <SecurityProfileCard />
        <RiskReport />
        <DevApprovalTool />
      </main>
    </div>
  );
}
