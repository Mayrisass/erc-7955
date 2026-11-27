import {
  type Config,
  type Connector,
  createConfig,
  unstable_connector,
} from "@wagmi/core";
import { type Address, defineChain } from "viem";

/**
 * Creates a wagmi config for the chain of the connected wallet.
 *
 * Wagmi only knows the chains it was configured with, but this app works on
 * whatever chain the wallet is on. A new config has its own connection state,
 * so the connection is seeded into it: components below it must see the same
 * account as the parent config. The config does not persist to storage, so it
 * does not overwrite the parent's persisted state.
 */
function createConnectedConfig({
  chainId,
  connector,
  accounts,
}: {
  chainId: number;
  connector: Connector;
  accounts: readonly Address[];
}): Config {
  const config = createConfig({
    chains: [
      defineChain({
        id: chainId,
        name: "unknown",
        nativeCurrency: {
          name: "unknown",
          symbol: "UNKN",
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [],
          },
        },
      }),
    ],
    connectors: [],
    storage: null,
    multiInjectedProviderDiscovery: false,
    transports: {
      [chainId]: unstable_connector(connector),
    },
  });

  const [first, ...rest] = accounts;
  if (!first) {
    throw new Error("connected wallet has no accounts");
  }
  config.setState({
    chainId,
    current: connector.uid,
    status: "connected",
    connections: new Map([
      [
        connector.uid,
        {
          accounts: [first, ...rest] as const,
          chainId,
          connector,
        },
      ],
    ]),
  });

  return config;
}

export { createConnectedConfig };
