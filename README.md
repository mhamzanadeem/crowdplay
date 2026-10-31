# CrowdPlay Moderation



**Your AI co-moderator for a safer Twitch community.**



Next.js App Router / React / TypeScript application implementing the approved charcoal-and-lime design. Jev recommends what needs attention; humans confirm every moderation decision and Twitch deletion. No auto-ban, auto-timeout, auto-warning or auto-deletion. Timeout is deliberately disabled.



## Run locally



Requires Node.js 22.18+ (24 recommended) and access to the npm registry.



```powershell

cd C:\CrowdPlay

npm install

if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }

npm run dev

```



Open http://localhost:3000. Without credentials, the app presents an explicitly labelled synthetic demo. It includes six pages, 248 demo messages, filters/search/sorting, conversation investigation, viewer histories, configurable rules, charts, local demo reviews and confirmation dialogs. Live errors retain the last live snapshot; they do not silently replace it with demo classifications.



Fill `.env.local` for live mode, initialize the MongoDB Atlas database with `npm run db:init`, register Twitch OAuth callbacks, then deploy on Vercel. [Setup](docs/SETUP.md), [Twitch](docs/TWITCH_SETUP.md), [Jev](docs/JEV_SETUP.md), [deployment](docs/DEPLOYMENT.md).



## Verification status



On 2026-10-31: **22 dependency-free unit tests passed**. TypeScript source parsing/local imports/configuration checks passed. Database integration test skipped because a disposable database is not configured; model evaluation did not call a provider. Browser E2E tests are written but not run.



Dependencies are installed and package-lock.json is included. TypeScript checking and ESLint pass. Production build remains blocked in the agent sandbox: Turbopack process/IPC failure, followed by EPERM writing generated types with webpack. Browser and live-service verification are pending. The user reported dependency advisories during installation; these still need review. This checkout is not deployment-verified.



```powershell

npm test

node scripts/verify-source.mjs

npm run typecheck

npm run lint

npm run build

npx playwright install chromium

npm run test:e2e

```



No Twitch OAuth session, EventSub delivery, real Jev call, live MongoDB transaction, Vercel deployment, video upload or Devpost submission has been claimed successful. Remaining steps and exact blockers are in [IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).



## Architecture



- `/dashboard`, `/inbox`, `/users`, `/rules`, `/analytics`, `/settings` share a React workspace and typed domain models.

- Twitch authorization-code OAuth with signed state, HttpOnly session cookie, encrypted server-side access/refresh tokens and hourly token validation.

- EventSub HMAC/replay checks → atomic idempotent MongoDB ingestion/jobs → bounded Jev batches → stored distributions → human review queue.

- MongoDB Atlas stores live state. Dashboard refresh uses authenticated polling every three seconds; no browser database credentials are exposed.

- Durable job leases, context-sensitive request cache, retry backoff and estimated budget reservations. Unknown provider outcomes retain reservations. This is not a guaranteed provider billing ceiling.

- Real deletion requires a short-lived signed confirmation bound to account, channel, exact message and text, consumed before Helix is called; attempted/result events are logged.



[MongoDB setup](docs/MONGODB_SETUP.md) · [Architecture](docs/ARCHITECTURE.md) · [Security](docs/SECURITY.md) · [Tests](docs/TESTING.md) · [Decisions](docs/DECISIONS.md)



## Provenance



Original CrowdPlay application built in this Codex chat after design approval on 2026-10-31. Ethan Rogers' MIT [Jev Chat for Twitch](https://github.com/ethanplusai/jev-chat-for-twitch) was inspected as a reference; its source, prompts and media were not copied into the application. [Audit](research/JEV_REPOSITORY_AUDIT.md). Standard library dependencies are listed in package.json; installed-version licence inventory remains pending installation.



Before submission, run `/status` in the primary Codex chat and save the session ID. [Submission checklist](submission/FINAL_CHECKLIST.md).



Database backend changed to MongoDB Atlas at the user’s request. `DB_URL` is server-only, `MONGODB_DB` defaults to `crowdplay`. The supplied connection string was moved out of `.env.example` into ignored `.env.local`. No Supabase keys or external JWT service are required. Historical PostgreSQL scripts are archived under docs/archive/postgres and must not be run for this backend.

