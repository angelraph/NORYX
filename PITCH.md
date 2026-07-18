# Noryx — pitch deck outline & demo script

Live app: https://noryx-lyart.vercel.app
Repo: github.com/angelraph/NORYX

Contracts (Monad Mainnet, all Sourcify-verified):
- `SecurityProfile`: `0x884EEa8281C15c3516f10Cc6864EBBaA453AF9d8`
- `ScoreRegistry`: `0x61b7de677d6548df8df1f73e107b69d67eee606b`
- `ScoreGatedDemo`: `0xa9ead41e9b1a5e2e1b388a5a6e4c7d450f9f73ab`

---

## 1. Elevator pitch (30 seconds)

"Every wallet drainer story starts the same way: someone approved a
contract they shouldn't have, and never checked back. Noryx scans your
live token approvals on Monad, scores your wallet's risk, and lets you
revoke what's dangerous in one click — all against real on-chain data,
nothing cached or mocked. But we didn't stop at a dashboard: your
security score can be **published on-chain** as an attestation, so it's
not just something our UI tells you — it's a fact any other Monad
contract can check. We even shipped a second, independent contract that
proves it: it only lets a wallet through if it has a published Noryx
score above a threshold."

---

## 2. The problem (slide)

- Approving a token contract is the #1 mechanism behind wallet-drainer
  exploits — not phishing links, not private key theft, an approval you
  clicked and forgot about.
- There's no easy way to see, across everything you've ever approved,
  which approvals are still live, how large they are, and whether the
  spender contract itself is trustworthy.
- Existing tools that solve this (revoke.cash and similar) stop at
  showing you a list and a client-side score. That score never leaves
  the browser tab — it's not something anything else can check.

## 3. The solution (slide)

Four things happen automatically the moment you connect a wallet:

1. **Scan** — every `Approval` event emitted recently, re-verified
   against the *current* live `allowance()` (a logged approval may
   already be spent or replaced).
2. **Audit** — every spender contract gets checked for Sourcify
   verification, deployment age (binary-searched from historical
   `eth_getCode`, not guessed), and whether it's even a contract.
3. **Score** — a 0–100 Wallet Security Score from approval size + the
   contract-level findings.
4. **Fix** — one-click real `approve(spender, 0)` revoke transactions.

Plus a saved on-chain policy (`SecurityProfile`): the user sets their own
rules (e.g. "flag unlimited approvals") and every scan checks against
*their own* saved preferences, not a generic threshold.

## 4. Why Noryx, not revoke.cash (the slide that answers the objection)

Someone will say "revoke.cash already does this." The honest answer:
scanning + revoking is table stakes, several tools do it well. The
structural difference is what happens to the score:

| | revoke.cash / typical scanner | Noryx |
|---|---|---|
| Score lives | client-side only, gone when you close the tab | published on-chain as a timestamped attestation |
| Who can check it | only that tool's own UI | any Monad contract |
| Proof this matters | none — it's a claim | a second, independently deployed contract (`ScoreGatedDemo`) that actually reads the attestation and gates an action on it |

This turns Noryx from "a dashboard" into a small piece of **on-chain
security infrastructure** — and it's only economical because Monad's
writes are cheap enough to publish a fresh attestation on every scan.
This is not a data-availability trick; the ScoreRegistry attestation is
enforced with real `require()` checks on-chain, verifiable independent
of Noryx's frontend.

## 5. Live demo script (~2–3 minutes)

Have two wallets ready ahead of time: **Wallet A** with some real
approval history (so the scan/revoke/score parts have something to
show), and **Wallet B** with a clean history (score ≥ 70) so the gated
demo can show a *pass*, not just a revert. Confirmed working end-to-end
on 2026-07-18.

1. Connect **Wallet A**. Narrate while it scans: "This is reading live
   `Approval` events and re-checking each one against the current
   allowance right now — nothing here is precomputed."
2. Point at the Wallet Security Score card. Call out one flagged
   approval (unlimited, or an unverified/newly-deployed spender) and
   explain the specific reason it's flagged.
3. Click **Revoke** on that approval. Wait for confirmation. "That's a
   real `approve(spender, 0)` transaction, just landed on Monad
   Mainnet."
4. Scroll to **On-Chain Score Attestation**. "Right now this score only
   lives in my browser. Watch what happens when I publish it." Click
   **Publish score on-chain**, confirm, wait for the tx.
5. Click **Try gated action**. With Wallet A likely below the demo
   threshold (70), this should **revert** — call that out explicitly:
   "This is a contract I don't control, actually rejecting me because my
   published score isn't high enough. That's the proof this is real
   enforcement, not a UI badge."
6. Switch to **Wallet B**. Publish its (higher) score, click **Try gated
   action** again — this time it succeeds. "Same mechanism, same
   contract, different outcome, purely because the on-chain attestation
   is different. That's composability: any Monad project could gate a
   mint, an allowlist, a lending term, on a wallet's Noryx score,
   without ever talking to us."

## 6. Anticipated questions

- **"Isn't this just an oracle for your own number?"** — Yes, and that's
  the point: it's a *user-controlled, verifiable* oracle. The user signs
  the publish transaction themselves; nothing is pushed on their behalf.
  Anyone can independently recompute the score from the same on-chain
  data Noryx reads (approvals, verification status, contract age) and
  compare it to what was published — it's not a black box.
- **"Why not gate real value (a vault, a mint) instead of a toy
  contract?"** — Deliberate scope cut for the hackathon timeline; the
  toy contract isolates and proves the composability mechanism (a
  `require()` against `getScore()`) without adding financial risk to a
  live mainnet demo. The mechanism is identical to what a real
  integration would use.
- **"What stops someone from publishing a fake high score?"** —
  `publishScore` isn't currently validated against Noryx's own
  computation on-chain (the scoring logic lives in the frontend, per the
  `SecurityProfile` design). Today the trust model is "the number came
  from Noryx's published, inspectable scoring logic, signed by the
  user's own key" — same trust model as any client-computed value a user
  chooses to attest to. Flagged as the natural next step: move scoring
  on-chain or add a verifier.
- **"Does this work on any chain?"** — Contracts are Monad Mainnet only
  right now (chain 143). Nothing in the design is Monad-specific beyond
  relying on cheap writes to make per-scan publishing economical.

## 7. Tech stack (slide)

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- wagmi 3 + viem for all on-chain reads/writes
- Solidity (`SecurityProfile.sol`, `ScoreRegistry.sol`,
  `ScoreGatedDemo.sol`), compiled/deployed/verified with plain Node
  scripts (no Foundry/Hardhat)
- Monad Mainnet (chain ID 143)

See `README.md` for full technical detail on the approval-scan
mechanics, contract-risk checks, and rate-limit handling.
