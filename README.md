# ERC-7955: Permissionless CREATE2 Factory

This project implements [ERC-7955: Permissionless CREATE2 Factory](https://ercs.ethereum.org/ERCS/erc-7955): a mechanism for permissionlessly deploying CREATE2 factory contracts (similar to the Safe singleton factory). This is an improvement over the status quo:

1. Unlike CREATE2 factories that rely on pre-signed transactions generated with Nick's method like the [Arachnid/deterministic-deployment-proxy](https://github.com/Arachnid/deterministic-deployment-proxy), it is not sensitive to different gas parameters on different networks, and works with networks that require EIP-155 replay protected transactions. Additionally, a reverted transaction (out of gas because of different gas schedules on different networks, for example) does not "burn" the factory address, and the factory can be deployed successfully with a subsequent transaction.
2. Unlike CREATE2 factories that use creation transactions (with `transaction.to = null`) like the [safe-global/safe-singleton-factory](https://github.com/safe-global/safe-singleton-factory) and [pcaversaccio/createx](https://github.com/pcaversaccio/createx) it is permissionless and does not require access to a secret private key. Additionally, like with the case of the pre-signed transactions, a reverted transaction (because of user error, for example) does not "burn" the factory address, and the factory can be deployed successfully with a subsequent transaction.
3. Unlike pre-installed factories like with [OP Stack](https://github.com/ethereum-optimism/optimism/blob/70dcffb8d6ff2bd61e73ab3a334427b063bf7a2f/packages/contracts-bedrock/src/libraries/Preinstalls.sol), it is permissionless.

## Deployment

The address of the CREATE2 factory is `0xC0DEb853af168215879d284cc8B4d0A645fA9b0E`. It can be deployed to any EVM chain that supports EIP-7702 (Pectra or later). Chains without EIP-7702 support cannot be bootstrapped. The web app checks for support, and the status page (`/status/`) shows which chains support it.

## How it Works

This CREATE2 factory deployment method relies on a publicly known private key, which signs EIP-7702 delegations to execute the deployment. The public deployer account at address `0x962560A0333190D57009A0aAAB7Bfa088f58461C` signs a delegation to any contract that does a `CREATE2` with a predefined `INITCODE` and `SALT`:

```solidity
bytes constant INITCODE = hex"7c60203d3d3582360380843d373d34f5806019573d813d933efd5b3d52f33d52601d6003f3";
bytes32 constant SALT = hex"000000000000000000000000000000000000000000000000000000000001bec5";
```

This guarantees a CREATE2 factory contract be deployed to `0xC0DEb853af168215879d284cc8B4d0A645fA9b0E` with well-known code. Note that it is not an issue for the deployer private key to be publicly known, as transactions from that account, or alternate delegations can neither prevent the successful deployment of the CREATE2 factory, or have it contain unexpected runtime code.

This repository contains a reference `Bootstrap` contract that the deployer account can delegate to in order to deploy the CREATE2 factory.

The deployer key and mnemonic are published in `packages/core/src/index.ts` on purpose. Anyone can use them, so do not send funds to the deployer address. The `Bootstrap` runtime is verified by `isBootstrapRuntime` (in `packages/core/src/index.ts`) before the web app delegates to it.

## Development

Requires Node.js 22 (see `.nvmrc`).

```sh
npm ci              # install dependencies
npm run compile -w packages/core   # compile the Solidity contracts (required before the app builds)
npm run build       # compile, type-check, and build the web app into packages/app/dist
npm test            # core contract tests and status page unit tests
npm run lint        # Biome lint and format check
npm start           # run the web app locally with Vite
```

The contract tests in `packages/core/test/Factory.spec.ts` check that the
constants in `packages/core/contracts/Factory.sol` match the TypeScript
constants in `packages/core/src/index.ts`, and that the CREATE2 salt is the
first one that produces a `0xC0DE` address.

The status page (`packages/app/status`, served at `/status/`) fetches the chain
list from ChainList and checks each RPC endpoint. It reports a chain as
"deployed" if the factory's runtime code is present, "supported" if an
EIP-7702 test call succeeds, and "not supported" or "unavailable" otherwise.

## Known Issues

It is possible to front-run transactions that invalidate the deployer's EIP-7702 delegation and cause the deployment to fail. This, however, comes at a gas cost to the attacker, with limited benefit beyond delaying the deployment of the CREATE2 factory. Additionally, persistent attackers can be circumvented by either using private transaction queues or working with block builders directly to ensure that the EIP-7702 bootstrapping transaction is not front-run.
