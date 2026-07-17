import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors";
import { monadTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: "Noryx" }),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
