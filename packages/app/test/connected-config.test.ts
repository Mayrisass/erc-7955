import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { connect, createConfig, getAccount, getClient } from "@wagmi/core";
import { custom } from "viem";
import { mainnet } from "wagmi/chains";
import { mock } from "wagmi/connectors";
import { createConnectedConfig } from "../src/lib/connected-config.ts";

const address = "0x1111111111111111111111111111111111111111";

async function connectedWallet(chainId: number) {
  const transport = custom({
    async request({ method }) {
      if (method === "eth_chainId") return `0x${chainId.toString(16)}`;
      if (method === "eth_accounts" || method === "eth_requestAccounts") {
        return [address];
      }
      throw new Error(`unexpected method ${method}`);
    },
  });
  const parent = createConfig({
    chains: [mainnet],
    connectors: [mock({ accounts: [address] })],
    storage: null,
    multiInjectedProviderDiscovery: false,
    transports: { [mainnet.id]: transport },
  });
  await connect(parent, { connector: parent.connectors[0] });
  return getAccount(parent);
}

describe("createConnectedConfig", () => {
  it("shares the parent's connection, so children see the account", async () => {
    const { connector, addresses } = await connectedWallet(1);
    assert.ok(connector && addresses);

    const config = createConnectedConfig({
      chainId: 1,
      connector,
      accounts: addresses,
    });
    const account = getAccount(config);

    assert.equal(account.status, "connected");
    assert.equal(account.address, address);
    assert.equal(account.chainId, 1);
  });

  it("uses the connected chain, even if it was not configured", async () => {
    const { connector, addresses } = await connectedWallet(1);
    assert.ok(connector && addresses);

    const config = createConnectedConfig({
      chainId: 31337,
      connector,
      accounts: addresses,
    });

    assert.equal(getAccount(config).chainId, 31337);
    assert.equal(getClient(config).chain?.id, 31337);
  });

  it("does not persist its state to storage", async () => {
    const { connector, addresses } = await connectedWallet(1);
    assert.ok(connector && addresses);

    const config = createConnectedConfig({
      chainId: 1,
      connector,
      accounts: addresses,
    });

    assert.equal(config.storage, null);
  });

  it("refuses to build a connection without accounts", async () => {
    const { connector } = await connectedWallet(1);
    assert.ok(connector);

    assert.throws(
      () => createConnectedConfig({ chainId: 1, connector, accounts: [] }),
      /no accounts/,
    );
  });
});
