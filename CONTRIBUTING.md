# Contributing to SoroWave App

SoroWave is an independent community preview. Listing an issue here does not enroll it in Drips Wave or reserve a reward.

## Workflow

1. Read the linked GitHub issue and acceptance criteria.
2. Apply through the preview and wait for the repository maintainer to assign the GitHub issue before starting work.
3. Keep the change focused and open a pull request that references the issue with `Closes #<number>`.
4. Describe the user-visible change and include screenshots for interface changes.

## Local checks

Use Node.js 22.12 or newer, run `npm ci`, then `npm run build`. The app uses Vite, the Freighter API, and the Stellar SDK. Wallet interactions must remain on testnet unless a separately reviewed production plan is approved.
