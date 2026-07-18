# Noryx

**A live onchain wallet security auditor.**

Noryx continuously analyzes your wallet's live approvals and permissions,
explains the risk in plain English, and lets you fix it with a real
blockchain transaction. It answers "what risks already exist in my wallet
right now" — not "what will happen if I sign this," which would require
transaction simulation infrastructure we deliberately chose not to depend
on (see [What's not built](#whats-not-built), below).

Live app: **https://noryx-lyart.vercel.app**

Contracts (Monad Mainnet, verified):
- `SecurityProfile`: [`0x884EEa8281C15c3516f10Cc6864EBBaA453AF9d8`](https://monadscan.com/address/0x884EEa8281C15c3516f10Cc6864EBBaA453AF9d8)
- `ScoreRegistry`: [`0x61b7de677d6548df8df1f73e107b69d67eee606b`](https://monadscan.com/address/0x61b7de677d6548df8df1f73e107b69d67eee606b)
- `ScoreGatedDemo`: [`0xa9ead41e9b1a5e2e1b388a5a6e4c7d450f9f73ab`](https://monadscan.com/address/0xa9ead41e9b1a5e2e1b388a5a6e4c7d450f9f73ab)

## The problem

Every crypto user has clicked "Approve" without really knowing what they
were signing away. A token approval can be unlimited, to a contract that
didn't exist yesterday, and there's no easy way to see — across everything
you've ever approved — which of those are actually still live and how much
they could cost you.

## The solution

Connect your wallet and Noryx scans your **live, current** token approvals
on Monad Mainnet — not a cached snapshot, not a mock — scores each one by
risk, and gives you a one-click way to fix it:

1. **Connect** your wallet — scanning starts automatically, no button to click
2. **Scan** — Noryx reads every `Approval` event your wallet has emitted
   recently across a tracked token set, then re-verifies each one against
   the *current* `allowance()` on-chain (a logged approval can already have
   been spent or replaced — only the live value is trustworthy)
3. **Detect** — for every spender contract behind an active approval, Noryx
   checks whether it's verified (via Sourcify), how recently it was
   deployed (binary-searched from historical `eth_getCode`, not a claim
   without evidence), and whether it's even a contract at all — approving
   a plain wallet address is itself unusual
4. **Score** — a 0–100 Wallet Security Score combining approval-amount risk
   (unlimited is high risk; amounts far exceeding your balance are medium)
   with the contract-level findings above
5. **Fix it** — a real `approve(spender, 0)` revoke transaction, one click,
   right there on the row that's risky
6. **Set your own policy** — save your approval-safety preferences
   (e.g. "flag unlimited approvals") on-chain in a small `SecurityProfile`
   contract. Every scan checks your live approvals against *your own*
   saved rules, not a one-size-fits-all threshold.
7. **Publish it** — write your Wallet Security Score itself on-chain as a
   timestamped attestation in `ScoreRegistry`, so it's a fact any other
   Monad contract can read, not just a number this UI shows you once.

Nothing here is mocked. Wallet balance, approvals, contract verification
status, contract age, risk scores, revokes, saved preferences, and
published score attestations are all live reads/writes against Monad
Mainnet.

## Why this, and not a generic "explain any transaction" tool

Blind-signing risk tools that try to explain *every* transaction type
generically already exist (Blockaid, Wallet Guard, Rabby's built-in
preview). Noryx narrows to the single highest-value, best-understood
attack surface — **token approvals**, the actual mechanism behind most
wallet-drainer stories — and does that one thing with real on-chain data
end to end, rather than a shallow pass across everything.

## Why this, and not a client-side approval scanner (e.g. revoke.cash)

Scanning live approvals and offering a one-click revoke is table stakes —
several tools already do it well. Where Noryx diverges: the Wallet
Security Score isn't just rendered in a UI and thrown away when you close
the tab. It can be **published on-chain** (`ScoreRegistry.publishScore`)
as a timestamped attestation, and a second, independently deployed
contract (`ScoreGatedDemo`) demonstrates actually *consuming* it — gating
an action on whether the caller has a published score above a threshold.
That's the structural difference: a client-side score is a claim only the
tool's own UI can check; a published attestation is a fact any Monad
contract can check, including ones Noryx doesn't control. It's a small
step from "security dashboard" toward "security primitive other things
can build on" — practical on Monad specifically because writing a fresh
attestation on every scan is cheap enough to actually do.

## Tech stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- wagmi 3 + viem for wallet connection and all on-chain reads/writes
- Solidity (`SecurityProfile.sol`, `ScoreRegistry.sol`,
  `ScoreGatedDemo.sol`), compiled with `solc` and deployed with plain viem
  scripts (no Foundry/Hardhat dependency)
- Monad Mainnet (chain ID `143`)

## How the approval scan actually works

The public Monad Mainnet RPC caps `eth_getLogs` to a 100-block range.
`useApprovalScan`
(`src/hooks/use-approval-scan.ts`) handles both constraints directly: it
chunks the scan window into 100-block requests and runs them through a
single globally-concurrency-limited queue (not per-token) with
retry-with-backoff on rate-limit errors.

Every candidate `(token, spender)` pair found in the logs is then
re-checked against the **live** `allowance()` value via `multicall` before
being shown — a logged approval can be stale (spent, replaced, or
revoked since), so only the current on-chain state is trusted.

Tracked tokens (USDC, WETH, WMON) are sourced from Monad's official
token list and independently confirmed live via `eth_getCode` — see
`src/lib/tokens.ts`.

## How the contract-risk checks work

For every unique spender behind an active approval, `useSpenderMetadata`
(`src/hooks/use-spender-metadata.ts`) determines three things, all from
primary sources rather than a maintained allowlist:

- **Is it even a contract?** A plain `eth_getCode` check — approving a
  regular wallet address, rather than a contract, is itself unusual.
- **Is it verified?** Queried against Monad's Sourcify-compatible
  verification API (`src/lib/sourcify.ts`) — the same service
  `scripts/verify-contract.mjs` uses to verify our own contract.
- **How old is it?** Binary-searched from historical `eth_getCode`
  presence (`src/lib/contract-age.ts`) rather than guessed. The public RPC
  only retains ~1,928,000 blocks of historical state (confirmed by
  binary-searching the boundary directly — older queries fail outright), so
  a contract older than that window is reported as "established, at least
  this old" rather than a fabricated precise age.

Every RPC read in the app — the approval scan and these contract checks
alike — shares one rate-limit-safe queue (`src/lib/rpc-utils.ts`), since
the public RPC caps concurrent throughput at 25 requests/second and
multiple independent hooks bursting at once would blow through that.

## The `SecurityProfile` contract

Deliberately small — two functions, one struct:

```solidity
struct Preferences {
    bool blockUnlimitedApprovals;
    uint256 maxApprovalAmount;
    bool warnNewContracts;
    bool exists;
}

function savePreferences(bool, uint256, bool) external;
function getPreferences(address user) external view returns (bool, uint256, bool, bool);
```

The risk-scoring logic itself stays in the frontend; the contract's job is
to durably store each user's *own* policy so the frontend has something
real to check against. When a saved profile has
`blockUnlimitedApprovals = true` and a live approval is unlimited, the app
flags it as a policy violation, not just a generic risk badge.

Source: [`contracts/SecurityProfile.sol`](./contracts/SecurityProfile.sol)

## The `ScoreRegistry` and `ScoreGatedDemo` contracts

Two more deliberately small contracts, deployed separately from
`SecurityProfile` so its existing verified address and users' saved
preferences stay untouched.

`ScoreRegistry` publishes a wallet's score as a timestamped attestation:

```solidity
struct Attestation { uint8 score; uint64 timestamp; bool exists; }

function publishScore(uint8 score) external;
function getScore(address user) external view returns (uint8, uint64, bool);
```

`ScoreGatedDemo` is a second, independently deployed contract that reads
that attestation to gate an action — the point isn't the action itself
(it moves no funds), it's proving a published score is a *reusable*
on-chain fact rather than a number only Noryx's own UI ever displays:

```solidity
constructor(address scoreRegistry, uint8 minScore); // deployed with minScore = 70
function attemptGatedAction() external returns (bool); // reverts if no
  // attestation exists, or the caller's published score is below minScore
```

Source: [`contracts/ScoreRegistry.sol`](./contracts/ScoreRegistry.sol),
[`contracts/ScoreGatedDemo.sol`](./contracts/ScoreGatedDemo.sol)

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, connect a wallet on Monad Mainnet (chain ID
`143`, RPC `https://rpc.monad.xyz`). You'll need a small amount of real MON
in the wallet to pay gas for revokes — there's no faucet on mainnet.

## Project scripts

Contract tooling lives in `scripts/` and runs with plain Node — no
Foundry/Hardhat installation required. Each script takes a contract name
(defaults to `SecurityProfile` for backwards compatibility):

- `node scripts/compile-contract.mjs [Name]` — compiles `contracts/<Name>.sol`
  with `solc`, writes the ABI/bytecode artifact to `src/lib/contracts/`
- `node scripts/deploy-contract.mjs [Name] [constructorArgsJson]` — deploys
  using the key in `.env.local` (`DEPLOYER_PRIVATE_KEY`, gitignored, never
  committed); e.g. `node scripts/deploy-contract.mjs ScoreGatedDemo '["0x...",70]'`
- `node scripts/verify-contract.mjs [Name]` — submits the deployed contract
  to Monad's Sourcify-compatible verification API
- `node scripts/verify-deployment.mjs` — smoke-tests `SecurityProfile`'s
  read/write behavior
- `node scripts/verify-score-registry-deployment.mjs` — smoke-tests
  `ScoreRegistry` publish/read
- `node scripts/verify-gated-demo-deployment.mjs` — smoke-tests
  `ScoreGatedDemo`, confirming it reverts below the score threshold and
  succeeds above it

## What's not built

- Full arbitrary-transaction simulation ("paste any calldata and see the
  before/after balances") — this needs simulation infrastructure
  (Tenderly-style forked `eth_call`) that isn't confirmed to exist for
  Monad Mainnet, so it was deliberately cut in favor of shipping the
  approval-scanning path completely and honestly rather than half-building
  a broader promise.
