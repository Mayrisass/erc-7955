import { useMemo } from "react";
import { useAccount, useConfig, WagmiProvider } from "wagmi";
import { createConnectedConfig } from "$/lib/connected-config.ts";

// Wagmi typically only allows you to use configured chains. This makes sense
// for most dapps, but not here: we want to use whatever chain the current
// connector we are attached to is using. This allows users, for example, to
// deploy the permissionless CREATE2 factory for whatever network they have
// configured in their MetaMask without this dapp knowing about it in advance.
function ConnectorProvider({ children }: React.PropsWithChildren) {
  const parentConfig = useConfig();
  const { chainId, connector, addresses } = useAccount();
  const connectorConfig = useMemo(
    () =>
      chainId && connector && addresses && addresses.length > 0
        ? createConnectedConfig({
            chainId,
            connector,
            accounts: addresses,
          })
        : parentConfig,
    [chainId, connector, addresses, parentConfig],
  );

  return <WagmiProvider config={connectorConfig}>{children}</WagmiProvider>;
}

export { ConnectorProvider };
