import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { monad } from "./chains";

// A single injected() connector plus wagmi's built-in EIP-6963 multi-wallet
// discovery (on by default) is what actually detects every installed
// extension wallet — MetaMask, Phantom, Coinbase Wallet, Rabby, etc. — and
// connects to it directly. Wallet-specific SDK connectors (metaMask(),
// coinbaseWallet()) were tried here and caused real connect failures: they
// route through each wallet's own SDK flow (deep link / QR / popup) instead
// of the plain window.ethereum handshake, which can silently fail to
// connect even when the extension is installed and unlocked.
export const wagmiConfig = createConfig({
  chains: [monad],
  connectors: [injected()],
  transports: {
    [monad.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
