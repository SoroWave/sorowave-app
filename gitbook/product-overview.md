# Product overview

SoroWave gives an open-source contribution a visible path from an issue to reviewed work. The project has three parts:

| Part | Purpose | Repository |
| --- | --- | --- |
| Web app | Browse issues, connect Freighter on Testnet, apply, track progress, and operate the maintainer desk | [sorowave-app](https://github.com/SoroWave/sorowave-app) |
| API | Verify GitHub issues and pull requests, manage applications, and report Stellar configuration | [sorowave-api](https://github.com/SoroWave/sorowave-api) |
| Soroban contract | Hold a cycle pool, record points, finalize a cycle, and let contributors claim eligible rewards | [sorowave-contracts](https://github.com/SoroWave/sorowave-contracts) |

## Contribution lifecycle

1. A maintainer verifies a public, open GitHub issue and adds it to a cycle.
2. A contributor connects a Stellar Testnet wallet and applies with a GitHub username and short plan.
3. The maintainer reviews applications and assigns one contributor. The maintainer must also assign the issue in GitHub.
4. The contributor submits a pull request that targets the same repository and closes the issue.
5. After the pull request is merged, the maintainer confirms the work. The API checks the merge and the maintainer can record an idempotent Soroban points award.
6. If a pool has been deployed, funded, and finalized, eligible contributors can claim their share onchain.

## Point scale

The preview uses the following complexity scale:

| Complexity | Preview points |
| --- | ---: |
| Trivial | 100 |
| Medium | 150 |
| High | 200 |

Points are contribution records in this preview. They are not a promise of payment.
