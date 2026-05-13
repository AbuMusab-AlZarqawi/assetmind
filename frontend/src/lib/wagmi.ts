import { defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const ritualTestnet = defineChain({
  id:   1979,
  name: "Ritual Chain Testnet",
  nativeCurrency: {
    name:     "RITUAL",
    symbol:   "RITUAL",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.ritualfoundation.org"] },
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url:  "https://explorer.ritualfoundation.org",
    },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName:    "AssetMind",
  projectId:  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains:     [ritualTestnet],
  ssr:        true,
});
