# SoroWave App

The browser interface for SoroWave. Browse open tasks, submit an application, and preview maintainer workflows.

## Run

Start `sorowave-api` on `http://localhost:4173`, then serve this directory with a static server. For example: `npx serve .`.

If the API is unavailable, the page uses sample tasks so the interface remains explorable. This is a prototype; there is no login or wallet integration yet.

## Contribution ideas

- Add search, tags, and task detail pages.
- Add responsive accessibility checks and keyboard navigation.
- Add a Stellar wallet connection for testnet only.
