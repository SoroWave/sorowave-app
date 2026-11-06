# Maintainer guide

## Add work

1. Create a public GitHub issue with a clear scope and acceptance criteria.
2. Open **For maintainers** in the app, paste the issue URL, and choose **Verify issue**.
3. Confirm the canonical title and provide contributor guidance, category, and complexity.
4. Add the issue using the private API maintainer token.

The API looks up the issue through GitHub and rejects unavailable or closed issues. The API token must remain on the server; never put it in a `VITE_` variable or commit it to Git.

## Review applications

- Review the applicant's plan and issue fit in the maintainer desk.
- Accept and assign one contributor, then assign the issue to them in GitHub too. SoroWave does not change GitHub assignments automatically.
- Reject applications that will not proceed so the contributor can see the decision.
- Review the submitted pull request and confirm that GitHub shows it as merged before recording completion.

## Operate a testnet pool

Pool operations are optional and unavailable until a Soroban pool contract ID and numeric cycle ID are configured in the API. The pool administrator uses Freighter on Stellar Testnet to create and fund a cycle, finalize it after point awards, and review claims. Contract actions require the connected wallet to approve their transactions.

Use test tokens only. See [Soroban contracts](contracts.md) and [Security and preview limits](security.md).
