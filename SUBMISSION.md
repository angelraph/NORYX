# Noryx — submission description

Noryx is a live wallet approval security auditor for Monad.

Connect a wallet, or just paste in any address, no connection required, and Noryx scans every token approval it's ever granted. Each one gets re-checked against the real current on-chain allowance, because a logged approval can already be spent or revoked and only the live number tells you the truth. Every spender contract behind those approvals gets audited too: is it verified on Sourcify, how old is it, is it even a contract. All of that rolls into a 0-100 Wallet Security Score.

Anything risky gets fixed with a real approve(spender, 0) revoke transaction, one click. You can also save your own approval safety policy on-chain in a small SecurityProfile contract, so future scans check against your own rules instead of a generic threshold. Once you're happy with your score, you can publish it on-chain as a timestamped attestation, so it's not just something the UI shows you once, it's a fact any other Monad contract can read. A second contract, ScoreGatedDemo, proves that by actually gating an action on it.

The problem: everyone has clicked "Approve" without knowing what they signed away, sometimes unlimited, sometimes to a contract that didn't exist yesterday. Those approvals sit invisible in a wallet's history with no easy way to see which ones are still live or what they could cost you.

Noryx solves it live, end to end. Nothing is cached, mocked, or simulated. Balances, approvals, contract verification, contract age, revokes, saved policies, and published scores are all real reads and writes against Monad Mainnet.

What I learned: testnet assumptions don't carry over to mainnet even when the RPC interface looks identical. I had to empirically re-measure Monad Mainnet's real block time (about 0.4s, not testnet's 1s) and its eth_getCode historical-state retention window (about 1.93M blocks, not testnet's 5M), then recalibrate every block-count constant in the scan logic so scan windows and "deployed X ago" labels stayed accurate on the new chain instead of silently drifting. I also found Monad's own brand kit was inconsistent between its documented swatch and its live logo's actual fill color, worth verifying brand assets the same way you'd verify anything else.
