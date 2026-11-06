# Security and preview limits

SoroWave is an experimental Testnet preview. The Soroban contract is unaudited and must not receive real funds.

## Known limits

- GitHub usernames are not verified through OAuth.
- The API stores records in a local JSON file. A public deployment needs durable storage, backups, and operational monitoring.
- There are no GitHub webhooks, so repository and pull request changes are checked when the API handles a request rather than synchronized continuously.
- Pool claims are unavailable until the contract is deployed, initialized, funded, and finalized.
- The maintainer token is a shared API secret, not a full organization role or identity system.
- Preview points are not money and do not guarantee rewards.

## Before any production use

1. Add GitHub OAuth or GitHub App identity and organization-scoped maintainer roles.
2. Replace JSON-file storage with a production database, durable backups, and migration procedures.
3. Add contract accounting and authorization tests and obtain independent security review.
4. Define support, dispute, and incident-response processes.
5. Set up monitoring, rate limits, secret rotation, and recovery procedures.

Never place maintainer tokens or private keys in the frontend, Git history, public logs, or documentation.
