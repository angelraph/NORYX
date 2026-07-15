# Noryx

**A live onchain wallet security auditor.**

Noryx continuously analyzes your wallet's live approvals and permissions,
explains the risk in plain English, and lets you fix it with a real
blockchain transaction. It answers "what risks already exist in my wallet
right now" — not "what will happen if I sign this," which would require
transaction simulation infrastructure we deliberately chose not to depend
on (see [What's not built](#whats-not-built), below).

Live app: **https://noryx-lyart.vercel.app**
Contract (Monad Testnet, verified): [`0x884EEa8281C15c3516f10Cc6864EBBaA453AF9d8`](https://testnet.monadvision.com/address/0x884EEa8281C15c3516f10Cc6864EBBaA453AF9d8)

## The problem

Every crypto user has clicked "Approve" without really knowing what they
were signing away. A token approval can be unlimited, to a contract that
didn't exist yesterday, and there's no easy way to see — across everything
you've ever approved — which of those are actually still live and how much
they could cost you.

## The solution

Connect your wallet and Noryx scans your **live, current** token approvals
on Monad Testnet — not a cached snapshot, not a mock — scores each one by
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

Nothing here is mocked. Wallet balance, approvals, contract verification
status, contract age, risk scores, revokes, and saved preferences are all
live reads/writes against Monad Testnet.

## Why this, and not a generic "explain any transaction" tool

Blind-signing risk tools that try to explain *every* transaction type
generically already exist (Blockaid, Wallet Guard, Rabby's built-in
preview). Noryx narrows to the single highest-value, best-understood
attack surface — **token approvals**, the actual mechanism behind most
wallet-drainer stories — and does that one thing with real on-chain data
end to end, rather than a shallow pass across everything.

## Tech stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- wagmi 3 + viem for wallet connection and all on-chain reads/writes
- Solidity (`SecurityProfile.sol`), compiled with `solc` and deployed with
  a plain viem script (no Foundry/Hardhat dependency)
- Monad Testnet (chain ID `10143`)

## How the approval scan actually works

The public Monad Testnet RPC caps `eth_getLogs` to a 100-block range and
rate-limits to 25 requests/second. `useApprovalScan`
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
  only retains ~5,000,000 blocks of historical state (confirmed by testing
  directly — older queries fail outright), so a contract older than that
  window is reported as "established, at least this old" rather than a
  fabricated precise age.

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

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, connect a wallet on Monad Testnet (chain ID
`10143`, RPC `https://testnet-rpc.monad.xyz`), and get testnet MON from
the [faucet](https://faucet.monad.xyz) if needed.

## Project scripts

Contract tooling lives in `scripts/` and runs with plain Node — no
Foundry/Hardhat installation required:

- `node scripts/compile-contract.mjs` — compiles `SecurityProfile.sol`
  with `solc`, writes the ABI/bytecode artifact
- `node scripts/deploy-contract.mjs` — deploys using the key in
  `.env.local` (`DEPLOYER_PRIVATE_KEY`, gitignored, never committed)
- `node scripts/verify-contract.mjs` — submits the deployed contract to
  Monad's Sourcify-compatible verification API
- `node scripts/verify-deployment.mjs` — smoke-tests the deployed
  contract's read/write behavior

## What's not built

- Full arbitrary-transaction simulation ("paste any calldata and see the
  before/after balances") — this needs simulation infrastructure
  (Tenderly-style forked `eth_call`) that isn't confirmed to exist for
  Monad Testnet, so it was deliberately cut in favor of shipping the
  approval-scanning path completely and honestly rather than half-building
  a broader promise.
