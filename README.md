# CrowdPlay Moderation

Twitch chat moderation with human review and Jev classification. AI never bans, times out, warns or deletes messages automatically. Every real deletion requires confirmation bound to the exact moderator, channel and message.

## Run in PowerShell

Requires Node.js 22.18 or later.

```powershell
Set-Location C:\CrowdPlay
npm.cmd install
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run db:init
npm.cmd run test:services
npm.cmd run dev
```

Open http://localhost:3000 and choose **Sign in with Twitch**. Startup requires authentication; it never substitutes synthetic messages or statistics. A newly connected channel has an empty dashboard until real chat arrives.

## Configuration

Keep all credentials in ignored `.env.local`.

- `DB_URL`: MongoDB Atlas URI with a database user, percent-encoded password and the cluster hostname supplied by Atlas. `MONGODB_DB` defaults to `crowdplay`.
- `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`: credentials from your registered Twitch application.
- `NEXT_PUBLIC_APP_URL`: application origin, locally `http://localhost:3000`.
- `TWITCH_REDIRECT_URI`: exact registered OAuth callback, locally `http://localhost:3000/api/twitch/callback`. Register localhost rather than mixing it with 127.0.0.1.
- `SESSION_SECRET` and `ENCRYPTION_KEY`: separate random 32-byte values encoded as 64 hex characters. Missing values were generated only in this local working copy; other installations must supply their own.
- `TWITCH_EVENTSUB_SECRET`: separate webhook signature secret, 10-100 characters.
- `TYPESAFE_API_KEY`, `JEV_MODEL`, `JEV_INPUT_USD_PER_MILLION` and `JEV_OUTPUT_USD_PER_MILLION`: provider credentials/model and confirmed account pricing.

Atlas requires a running cluster, working SRV DNS, your server IP in Network Access and a database user with readWrite permissions on crowdplay. `db:init` reports safe DNS, authentication, permissions or network diagnostics without printing the URI or raw driver errors.

OAuth uses authorization-code exchange, signed expiring state, HttpOnly SameSite cookies, encrypted server-side tokens, refresh locking and token validation. Each database operation retains channel membership predicates. The browser never connects directly to MongoDB.

For live chat, deploy behind public HTTPS, update both application/callback URLs and register the new callback in Twitch. After sign-in, open Settings and create/check EventSub subscriptions. Twitch must verify the public webhook. Localhost OAuth alone does not deliver EventSub chat. Enable TypeSafe processing consent and classification only after configuring pricing and a channel budget.

## Service checks

`npm.cmd run test:services` runs three independent real connection tests: MongoDB connection/index initialization plus ping, Twitch application token plus validation, and a validated synthetic Jev classification. The Jev test may consume provider credits. It performs no Twitch moderation actions and never submits viewer chat.

The sign-in page and dashboard show separate service failures. Public health polling does not trigger paid inference. Jev remains **not verified** until a real classification response is observed. The Settings connection test is authenticated, rate limited and uses the existing consent and budget reservation workflow. Twitch application connectivity does not imply that a streamer has authorized the channel or that chat subscriptions are receiving messages.

## Verification

```powershell
npm.cmd test
npm.cmd run verify:source
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

Latest agent checkpoint (2026-11-01): 25 unit tests, source checks, TypeScript and lint pass. All three live checks ran and failed: Atlas SRV DNS failure, unreachable Twitch endpoint from the agent environment, and missing TypeSafe API key. These are not successful integration checks. Production build is blocked by sandbox EPERM writing generated Next route types. Browser startup did not become ready and was interrupted; browser tests remain unverified. No completed streamer OAuth, live chat ingestion or deployment is claimed.

Synthetic data remains only as explicit test fixtures; it is not loaded by the runtime workspace. Source, tests, deployment configuration and the lockfile are versioned. Planning documents and local publishing metadata are intentionally ignored at the user's request.

## MongoDB DNS troubleshooting

The native driver handles Atlas SRV/TXT discovery directly. A missing DNS record means the Atlas hostname/cluster must be checked. A resolver timeout means DNS connectivity must be checked. Optionally set `MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8` in `.env.local` only if those resolvers work on your network, then restart the app and run `npm.cmd run db:init`. This changes Node DNS resolution only, not Windows settings. If your network blocks SRV queries, copy the standard `mongodb://` connection string supplied by Atlas; preserve its TLS, replica-set and authentication options. Never guess Atlas node hostnames or disable TLS.

2026-11-01: Jev is deferred at user request. Its previous missing-key failure is recorded, not passed. JEV_ENABLED defaults to false; live Jev tests are explicitly skipped, provider calls are blocked, and UI reports a neutral Deferred state. MongoDB and Twitch remain required. Integration can be reconsidered later; code and synthetic unit tests are retained. To opt in later, set JEV_ENABLED=true and configure credentials, pricing and channel consent.
