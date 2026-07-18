const PREREQUISITES = [
  {
    title: "A wallet browser extension",
    body: "MetaMask, Coinbase Wallet, and Phantom all work. Noryx detects whichever you have installed.",
  },
  {
    title: "A little MON in your wallet",
    body: "You'll need a small amount to pay gas if you revoke an approval. This is real MON on Monad Mainnet, not test tokens — buy or bridge some in before you start.",
  },
  {
    title: "That's it",
    body: "No sign-up, no email, no download. Everything else happens automatically once you connect.",
  },
] as const;

const STEPS = [
  {
    title: "Connect",
    body: "Click \"Connect Wallet\" in the top right and pick your wallet from the list. Noryx starts scanning the moment you're connected, with no extra button to press.",
  },
  {
    title: "Scan",
    body: "An \"approval\" is a permission you once gave a smart contract to move a specific token out of your wallet, sometimes with no limit. Noryx looks back through your wallet's history for every approval you've ever granted, tracked across a set of common tokens.",
  },
  {
    title: "Verify",
    body: "A logged approval can already be stale: spent, replaced, or cancelled since. Noryx double-checks each one against what's actually still active on your wallet right now, so you only ever see approvals that are really live.",
  },
  {
    title: "Detect",
    body: "For every contract behind a live approval, Noryx checks three things a scam contract usually gets wrong: is it a real published contract at all, is its source code publicly verified, and is it brand new (freshly deployed contracts haven't had time to be tested by the community).",
  },
  {
    title: "Score",
    body: "Everything above rolls up into one Wallet Security Score from 0 to 100. 100 means nothing risky was found so far. Unlimited approvals, unverified contracts, and brand-new spenders each pull the score down.",
  },
  {
    title: "Fix it",
    body: "Found something risky? Click \"Revoke\" right on that row. It's a real transaction on Monad Mainnet that cancels the permission for good, so that contract can never move your tokens again.",
  },
  {
    title: "Set your own policy",
    body: "Decide what counts as \"risky\" for you, for example always flag unlimited approvals, and save it on-chain. Every future scan checks against your own saved rules, not a generic one-size-fits-all threshold.",
  },
] as const;

export function LandingHero() {
  return (
    <div className="relative flex flex-col gap-10 py-6 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-monad-purple/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 right-0 h-72 w-72 rounded-full bg-monad-cyan/20 blur-3xl"
      />

      <div className="relative flex flex-col items-start gap-4">
        <div className="flex flex-col gap-4">
          <h1 className="font-display bg-linear-to-r from-monad-purple to-monad-cyan bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-5xl">
            Know exactly what your wallet has approved.
          </h1>
          <p className="max-w-xl text-base text-white/50 sm:text-lg">
            Every crypto user has clicked &ldquo;Approve&rdquo; without really
            knowing what they were signing away. Noryx scans your{" "}
            <span className="text-white/80">live, current</span> token
            approvals on Monad Mainnet, scores each one by risk, and gives
            you a one-click way to fix it.
          </p>
        </div>
        <p className="text-sm font-medium text-monad-cyan">
          New here? Tap &ldquo;Connect Wallet&rdquo; in the top right to get
          started. The walkthrough below explains exactly what happens next.
        </p>
        <p className="text-xs text-white/30">
          Nothing here is mocked. Balances, approvals, contract verification,
          and revokes are all live reads and writes against Monad Mainnet —
          real funds, real transactions, real gas.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <p className="font-display mb-1 text-sm font-medium text-white">
          Before you start
        </p>
        <p className="mb-5 text-xs text-white/40">
          Never used a crypto wallet before? Here&apos;s everything you need.
        </p>
        <ol className="grid gap-5 sm:grid-cols-3">
          {PREREQUISITES.map((item, i) => (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-white/60">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-1 text-sm text-white/50">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-monad-pink/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/3 h-56 w-56 rounded-full bg-monad-orange/10 blur-3xl"
        />
        <p className="font-display relative mb-1 bg-linear-to-r from-monad-orange to-monad-pink bg-clip-text text-sm font-medium text-transparent">
          How it works: a full walkthrough
        </p>
        <p className="relative mb-5 text-xs text-white/40">
          Step by step, in plain English. No crypto background required.
        </p>
        <ol className="relative flex flex-col gap-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-monad-orange to-monad-pink p-px text-xs font-semibold text-white">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-black">
                  {i + 1}
                </span>
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
