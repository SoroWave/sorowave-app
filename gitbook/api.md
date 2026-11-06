# Application and API

The app is a Vite JavaScript frontend. The Node.js API stores preview cycles, issues, applications, assignments, pull request links, and completion records in a JSON database.

## API routes

| Method and path | Purpose | Access |
| --- | --- | --- |
| `GET /health` | Check API availability | Public |
| `GET /stellar/config` | Read public network settings and optional pool IDs | Public |
| `GET /stellar/status` | Read bounded Horizon and Soroban health checks | Public |
| `GET /stellar/accounts/:address` | Read a validated public account's Testnet balances | Public |
| `GET /waves`, `GET /waves/:id` | Read cycles and issue counts | Public |
| `GET /tasks?page=1&limit=20` | Browse paginated open issues; supports `q`, `category`, and `waveId` | Public |
| `GET /tasks?all=true` | Include assigned and completed issues | Public |
| `GET /tasks/:id` | Read an issue listing | Public |
| `GET /github/issue?url=...` | Verify a public GitHub issue and fetch its title/body | Public |
| `POST /tasks` | Add a verified issue | Maintainer token |
| `GET /applications?applicant=username` | Read a redacted applicant status view | Public |
| `GET /applications` | Read full application records | Maintainer token |
| `POST /applications` | Apply to an issue | Public |
| `PATCH /applications/:id` | Submit a pull request URL | Public when assigned; maintainer token for review status changes |
| `GET /leaderboard?waveId=...` | Read completed preview points | Public |

Send the maintainer token as `Authorization: Bearer <token>`. Configure it only in the API environment. Public application responses omit messages, wallet addresses, and award transaction hashes.

## Runtime configuration

The frontend reads `VITE_API_URL` at build time and defaults to `http://localhost:4173` for local use. The API accepts `PORT`, `SOROWAVE_MAINTAINER_TOKEN`, `SOROWAVE_CONTRACT_ID`, `SOROWAVE_TOKEN_CONTRACT_ID`, and `SOROWAVE_WAVE_ID`. Contract settings are optional in the preview; without them, onchain reward operations remain unavailable.
