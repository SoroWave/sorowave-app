# SoroWave App

The browser interface for SoroWave. Browse open tasks, submit an application, and preview maintainer workflows.

## Run

Requires Node.js 20.19+.

```sh
npm install
npm run dev
```

Start `sorowave-api` on `http://localhost:4173` in a second terminal. Copy `.env.example` to `.env.local` to change the API URL. Install the Freighter browser wallet and switch it to Stellar Testnet before connecting. The app checks the wallet network and will not use a wallet connected to another network. The test XLM button explicitly calls Friendbot only after you click it.

The board and application flow are a prototype; applications are stored by the local API. No wallet transaction or bounty payment is currently submitted from the app. Contract transactions should be enabled only after the contract has been deployed, initialized, and reviewed on testnet.

## Contribution ideas

- Add search, tags, and task detail pages.
- Add responsive accessibility checks and keyboard navigation.
- Add Soroban bounty creation and release after a reviewed testnet deployment.
