# Run SoroWave locally

The app and API require Node.js 22.12 or newer. The contracts also require Rust, the WebAssembly target, and the Stellar CLI to build.

## App

```sh
cd sorowave-app
npm install
npm run dev
```

The Vite development server opens the app, which uses `http://localhost:4173` as the default API URL. Set `VITE_API_URL` in a local environment file only if the API runs elsewhere.

## API

```sh
cd sorowave-api
npm install
cp .env.example .env
npm start
```

Set a private development value for `SOROWAVE_MAINTAINER_TOKEN` in `.env`. Do not commit `.env`. The maintainer desk and issue publishing flow ask for this token in the browser session.

## Contracts

Install the [Stellar CLI](https://developers.stellar.org/docs/tools/cli/stellar-cli), Rust, and the WebAssembly target. In `sorowave-contracts`, run:

```sh
stellar contract build
```

Deployment and initialization are intentionally operator actions. Use Stellar Testnet and a disposable wallet only.

## API health check

Once the API starts, open `http://localhost:4173/health`. A healthy response includes `ok: true` and `name: "sorowave-api"`.
