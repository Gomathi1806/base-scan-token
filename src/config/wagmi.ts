import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { Attribution } from 'ox/erc8021';

// ⭐ YOUR BUILDER CODE — from base.dev > Settings > Builder Code
const BUILDER_CODE = 'YOUR-BUILDER-CODE-HERE';  // e.g., 'bc_b7k3p9da'

// This suffix gets auto-appended to ALL transactions from your app
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BUILDER_CODE],
});

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),  // Works with Coinbase Wallet, MetaMask, etc.
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(),
  },
  // ⭐ This is the magic — every transaction gets your builder code
  dataSuffix: DATA_SUFFIX,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
