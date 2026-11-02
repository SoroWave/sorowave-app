# SoroWave App

The browser interface for SoroWave. It includes six routed pages: Explore, Issue details, Add an issue, Applications and points, Maintainer review desk, and About. The maintainer desk also checks Stellar testnet service health and shows whether the pool and token contract IDs are configured.

## Run

Requires Node.js 18+.

```sh
npm install
npm run dev
```

Start `sorowave-api` on `http://localhost:4173` in a second terminal. Copy `.env.example` to `.env.local` to change the API URL. Install the Freighter browser wallet and switch it to Stellar Testnet before connecting. The app checks the wallet network and will not use a wallet connected to another network. The test XLM button explicitly calls Friendbot only after you click it.

Maintainers add public GitHub issues; the API checks that an issue exists and is open. Contributors apply, wait for assignment, then submit a pull-request link. Maintainers record review and completion, and the preview leaderboard totals completed issue points. The maintainer controls have no authentication and are for local review only. No wallet transaction or bounty payment is submitted by the app. Contract transactions should be enabled only after the pool contract has been deployed, initialized, reviewed, and connected to an authenticated service.

The cycle follows the common Wave points scale: Trivial (100), Medium (150), and High (200). The preview enforces up to 15 pending applications per contributor and up to 4 assigned issues per organization. Accepting an applicant makes other pending applications for that issue inactive.

## Contribution ideas

- Add GitHub OAuth and organization-scoped maintainer roles.
- Add GitHub App webhooks for repository and pull-request status synchronization.
- Connect the leaderboard to a deployed and reviewed Soroban pool.
