import { ConnectWallet } from "@/components/connect-wallet";

const STEPS = [
  {
    title: "Connect",
    body: "Connect your wallet — scanning starts automatically, no button to click.",
  },
  {
    title: "Scan",
    body: "Noryx reads every Approval event your wallet has emitted recently across a tracked token set, then re-verifies each one against the current allowance() on-chain.",
  },
  {
    title: "Detect",
    body: "For every spender contract behind an active approval, Noryx checks whether it's verified, how recently it was deployed, and whether it's even a contract at all.",
  },
  {
    title: "Score",
    body: "A 0–100 Wallet Security Score combining approval-amount risk with the contract-level findings above.",
  },
  {
    title: "Fix it",
    body: "A real approve(spender, 0) revoke transaction, one click, right there on the row that's risky.",
  },
  {
    title: "Set your own policy",
    body: "Save your approval-safety preferences on-chain in a small SecurityProfile contract. Every scan checks your live approvals against your own saved rules.",
  },
] as const;

export function LandingHero() {
  return (
    <div className="relative flex flex-col gap-10 py-6 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 right-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
      />

      <div className="relative flex flex-col items-start gap-6">
        <div className="flex flex-col gap-4">
          <h1 className="bg-linear-to-r from-violet-400 to-cyan-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-5xl">
            Know exactly what your wallet has approved.
          </h1>
          <p className="max-w-xl text-base text-white/50 sm:text-lg">
            Every crypto user has clicked &ldquo;Approve&rdquo; without really
            knowing what they were signing away. Noryx scans your{" "}
            <span className="text-white/80">live, current</span> token
            approvals on Monad Testnet, scores each one by risk, and gives
            you a one-click way to fix it.
          </p>
        </div>
        <ConnectWallet />
        <p className="text-xs text-white/30">
          Nothing here is mocked — balances, approvals, contract
          verification, and revokes are all live reads/writes against Monad
          Testnet.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <p className="mb-5 text-sm font-medium text-white">How it works</p>
        <ol className="grid gap-5 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-white/60">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{step.title}</p>
                <p className="mt-1 text-sm text-white/50">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
