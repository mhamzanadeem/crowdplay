# MongoDB Atlas setup

The live backend now uses MongoDB Atlas, replacing PostgreSQL/Supabase. Existing SQL files are historical archives only. No existing PostgreSQL data was transferred: no live PostgreSQL database had been configured or verified.

## Environment

Use ignored `.env.local`:

```env
DB_URL=mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER/crowdplay?retryWrites=true&w=majority
MONGODB_DB=crowdplay
```

The URI above is a placeholder. The connection string supplied in `.env.example` was moved into `.env.local`, preserving credentials/cluster connection options, changing the database path and appName label to crowdplay. `.env.example` now has no real URI. Do not commit `.env.local` or paste connection strings into chat/logs/screenshots.

MONGODB_DB explicitly selects the application database; if omitted it defaults to crowdplay. A database name in the connection string does not by itself grant database-user permissions. Ensure the Atlas database user has readWrite on crowdplay. Keep any required authSource options and percent-encoded credentials from the Atlas-generated URI. Permit the development/deployment environment through the Atlas network access settings; this tool did not widen network access or change account permissions.

The database is created when collections/indexes are initialized or documents first written. No Supabase URL, service-role key, publishable key, JWT signing secret or SQL migration is used. The application's own SESSION_SECRET and ENCRYPTION_KEY are still required for secure Twitch sessions/token encryption. These are locally generated random secrets, not JWTs from a third-party service.

## Initialize

From PowerShell with Node 24:

```powershell
Set-Location C:\CrowdPlay
npm.cmd install
npm.cmd run db:init
npm.cmd run dev
```

`db:init` loads .env.local, connects with the native MongoDB driver, pings the database and initializes unique/TTL/query indexes. It prints no connection URI or raw driver error. The app also initializes indexes idempotently on its first database connection. Initialization does not create Twitch permissions or send moderation actions.

A configured Atlas connection could not be tested here because dependency installation is blocked by registry.npmjs.org DNS. Do not assume initialization succeeded until db:init actually passes.

## Storage and concurrency

Collections: app_users, channels, channel_members, oauth_tokens, app_sessions, application_settings, channel_rules, messages, moderation_actions, classification_jobs, usage_reservations, webhook_events, classification_cache and request_limits.

- Original messages hold their validated classification and local-rule signals.
- Unique channel/message and event IDs prevent duplicate intake; a transaction persists event/message/job together.
- Atomic job claims and lease-bound transactional completion fence stale workers.
- Concurrent budget reservations serialize by writing the channel settings document before checking usage.
- Unique request/result index consumes deletion intents before any Twitch call.
- TTL indexes and explicit retention predicates prevent expired sessions/messages from being used while background deletion catches up.

Use an Atlas replica set. The official driver documents [multi-document transactions](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/); Atlas Free runs a replicated deployment with [documented limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/). No specific throughput, uptime or free-tier capacity guarantee is made for this application.

MongoDB does not have the old PostgreSQL foreign keys or RLS policies. Application authorization and transaction boundaries replace them; direct database access remains server-only. Do not expose DB_URL as NEXT_PUBLIC_DB_URL.

## Disposable integration test

Use a separate database name, never crowdplay:

```powershell
$env:CROWDPLAY_RUN_DATABASE_TESTS = '1'
$env:MONGODB_TEST_DB = 'crowdplay_test_local'
npm.cmd run test:database
Remove-Item Env:CROWDPLAY_RUN_DATABASE_TESTS
Remove-Item Env:MONGODB_TEST_DB
```

The test requires read/write/index permissions for the separately named test database and uses the DB_URL cluster connection. It checks cross-channel denial, duplicate-event races, concurrent budget reservations, job lease fencing and duplicate deletion intents. It sends no Twitch or Jev request. Cleanup removes only documents created by this test in the explicitly separate database; it does not drop a database. Indexes/test collections remain reusable.
