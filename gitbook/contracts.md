# Soroban contracts

The contract repository contains a prototype shared-pool lifecycle:

- An administrator initializes a pool contract with an admin and token contract.
- The cycle creator transfers test tokens into escrow when creating a pool.
- An authorized administrator records contributor points. The application ID makes an award idempotent.
- The administrator finalizes the cycle after point awards are settled.
- Contributors claim their pro-rata share after finalization.
- The creator can cancel and receive a refund only before any points have been awarded.

Claims use integer arithmetic. Rounding remainder stays in the pool until later claimants; the final points claimant receives the remaining pool amount.

## Build

Install Rust, the WebAssembly target, and the Stellar CLI, then run `stellar contract build` from the `sorowave-contracts` repository. Follow the official [Stellar smart contract guide](https://developers.stellar.org/docs/build/smart-contracts/overview).

## Deployment status

No production deployment is included. Testnet deployment and initialization need an operator with a funded disposable Testnet identity. After deployment, configure the contract ID, token contract ID, and numeric cycle ID in the API environment. Never commit wallet secrets. Do not use real funds.
