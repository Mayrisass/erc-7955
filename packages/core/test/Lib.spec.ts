import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import type { Hex } from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { deployer, factory, isBootstrapRuntime } from "../src/index.ts";

describe("TypeScript Library", async () => {
  const { viem } = await network.connect();

  it("should match deployer address", () => {
    for (const account of [
      mnemonicToAccount(deployer.mnemonic),
      privateKeyToAccount(deployer.privateKey),
    ]) {
      assert.strictEqual(deployer.address, account.address);
    }
  });

  it("should match Solidity constants", async () => {
    const constants = await viem.deployContract("Constants");

    assert.strictEqual(deployer.address, await constants.read.DEPLOYER());
    assert.strictEqual(factory.salt, await constants.read.SALT());
    assert.strictEqual(factory.address, await constants.read.ADDRESS());
    assert.strictEqual(factory.initCode, await constants.read.INITCODE());
    assert.strictEqual(factory.runtimeCode, await constants.read.RUNCODE());
    assert.strictEqual(factory.codeHash, await constants.read.CODEHASH());
  });
});

describe("Bootstrap runtime verification", async () => {
  const { viem } = await network.connect();

  it("should recognize the deployed Bootstrap runtime at its address", async () => {
    const client = await viem.getPublicClient();
    const bootstrap = await viem.deployContract("Bootstrap");
    const code = await client.getCode({ address: bootstrap.address });

    assert.ok(code);
    assert.ok(isBootstrapRuntime(code, bootstrap.address));
  });

  it("should reject the Bootstrap runtime at a different address", async () => {
    const client = await viem.getPublicClient();
    const bootstrap = await viem.deployContract("Bootstrap");
    const other = await viem.deployContract("Delegate");
    const code = await client.getCode({ address: bootstrap.address });

    assert.ok(code);
    assert.ok(!isBootstrapRuntime(code, other.address));
  });

  it("should reject modified runtime code", async () => {
    const client = await viem.getPublicClient();
    const bootstrap = await viem.deployContract("Bootstrap");
    const code = await client.getCode({ address: bootstrap.address });

    assert.ok(code);
    const tampered = `${code.slice(0, -2)}${code.endsWith("00") ? "01" : "00"}`;
    assert.ok(!isBootstrapRuntime(tampered as Hex, bootstrap.address));
    assert.ok(!isBootstrapRuntime("0x", bootstrap.address));
    assert.ok(!isBootstrapRuntime(factory.runtimeCode, bootstrap.address));
  });
});
