# SoroWave App

The browser interface for SoroWave. It includes six routed pages: Explore, Issue details, Add an issue, Applications and points, Maintainer review desk, and About. The maintainer desk also checks Stellar testnet service health and shows whether the pool and token contract IDs are configured.

## Run

Requires Node.js 22.12+.

```sh
npm install
npm run dev
```

Start `sorowave-api` on `http://localhost:4173` in a second terminal. Set `SOROWAVE_MAINTAINER_TOKEN` in the API's local `.env`; the maintainer desk prompts for that value. Copy `.env.example` to `.env.local` to change the API URL. Install the Freighter browser wallet and switch it to Stellar Testnet before connecting. The app checks the wallet network and will not use a wallet connected to another network. The test XLM button explicitly calls Friendbot only after you click it.

Maintainers add public GitHub issues; the API checks that an issue exists and is open. Contributors connect a Stellar testnet wallet, apply, wait for assignment, then submit a pull-request link. After GitHub confirms the PR is merged, a maintainer signs an idempotent Soroban points award with Freighter. The API records the completion and transaction hash. The app reads pool state, contributor points, and claim state directly from Soroban; eligible contributors can claim after the pool is funded and finalized. Until the contract is deployed and initialized, configure `SOROWAVE_CONTRACT_ID`, `SOROWAVE_TOKEN_CONTRACT_ID`, and the numeric `SOROWAVE_WAVE_ID` in the API environment. The UI reports the pool as unavailable until then.

The cycle follows the common Wave points scale: Trivial (100), Medium (150), and High (200). The API preview enforces up to 15 pending applications per contributor and up to 4 assigned issues per organization. The maintainer token stays in the current browser tab only. Never add it to `VITE_API_URL` or another frontend build variable. The contract is unaudited and the app is testnet-only; do not use real funds.

## Contribution ideas

- Add organization-scoped maintainer roles and GitHub OAuth before public launch.
- Add GitHub App webhooks for repository and pull-request status synchronization.
