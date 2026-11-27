import { type Address, concat, type Hex, keccak256, size, slice } from "viem";
import Bootstrap from "../build/artifacts/contracts/Bootstrap.sol/Bootstrap.json" with {
  type: "json",
};

const bootstrap = Object.freeze({
  abi: Bootstrap.abi,
  bytecode: Bootstrap.bytecode as `0x${string}`,
  deployedBytecode: Bootstrap.deployedBytecode as `0x${string}`,
  immutableReferences: Bootstrap.immutableReferences as Record<
    string,
    { start: number; length: number }[]
  >,
});

const deployer = Object.freeze({
  address: "0x962560A0333190D57009A0aAAB7Bfa088f58461C",
  mnemonic: "make code code code code code code code code code code coconut",
  privateKey:
    "0x942ba639ec667bdded6d727ad2e483648a34b584f916e6b826fdb7b512633731",
});

const factory = Object.freeze({
  address: "0xC0DEb853af168215879d284cc8B4d0A645fA9b0E",
  initCode:
    "0x7c60203d3d3582360380843d373d34f5806019573d813d933efd5b3d52f33d52601d6003f3",
  salt: "0x000000000000000000000000000000000000000000000000000000000001bec5",
  runtimeCode: "0x60203d3d3582360380843d373d34f5806019573d813d933efd5b3d52f3",
  codeHash:
    "0x2ad75e1e9642e6fce7d293d52fa5a8f62a79a2079abb7402256add02d6e8bc30",
});

/**
 * Checks whether `code` is the deployed runtime code of a Bootstrap contract
 * deployed at `address`.
 *
 * The Bootstrap runtime embeds its own address (as an immutable). Every
 * other byte must match the compiled runtime exactly, and the embedded value
 * must equal the EIP-7702 delegation designator hash for `address`, i.e.
 * `keccak256(0xef0100 ++ address)`.
 */
function isBootstrapRuntime(code: Hex, address: Address): boolean {
  const expected = bootstrap.deployedBytecode;
  if (size(code) !== size(expected)) {
    return false;
  }

  const immutables = Object.values(bootstrap.immutableReferences).flat();
  const isImmutable = (index: number) =>
    immutables.some(
      ({ start, length }) => index >= start && index < start + length,
    );

  const actual = code.slice(2);
  const want = expected.slice(2);
  for (let i = 0; i < want.length / 2; i++) {
    if (isImmutable(i)) {
      continue;
    }
    if (actual.slice(i * 2, i * 2 + 2) !== want.slice(i * 2, i * 2 + 2)) {
      return false;
    }
  }

  // Every immutable must be the delegation designator hash of this address.
  const delegation = keccak256(concat(["0xef0100", address]));
  return (
    immutables.length > 0 &&
    immutables.every(
      ({ start, length }) => slice(code, start, start + length) === delegation,
    )
  );
}

export { bootstrap, deployer, factory, isBootstrapRuntime };
