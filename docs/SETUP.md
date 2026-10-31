# Setup

Requires Node.js 22.18+ (24 recommended) and npm registry access. The current build environment cannot resolve registry.npmjs.org; dependency installation, full typecheck/build and live connection are still unverified.

1. `Set-Location C:\CrowdPlay`, then `npm.cmd install`. Keep the generated lockfile after checks pass; use npm ci on subsequent clean checkouts.
2. Use `.env.local` for secrets. A configured DB_URL has already been preserved there. Do not overwrite this file with the example. For a fresh clone only: `if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }`.
3. Configure server-only DB_URL and MONGODB_DB=crowdplay as explained in [MONGODB_SETUP.md](MONGODB_SETUP.md). Grant the Atlas database user readWrite on crowdplay and permit the required development/deployment network access.
4. Run `npm.cmd run db:init` to verify connectivity and create collections/indexes. No SQL migrations or Supabase project/keys are required.
5. Generate independent random secrets for ENCRYPTION_KEY, SESSION_SECRET, TWITCH_EVENTSUB_SECRET and CRON_SECRET. Each can use a fresh output from `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. No external JWT service/token is needed.
6. Register the Twitch application and configure Client ID/secret/callback per TWITCH_SETUP.md. NEXT_PUBLIC_APP_URL must exactly match the browser origin (localhost and 127.0.0.1 differ for CSRF).
7. Configure TypeSafe key/model/current input/output pricing. New channels require explicit third-party processing consent and classification enablement in Settings.
8. `npm.cmd run dev` and open http://localhost:3000. Demo works without a signed-in session; live account setup requires MongoDB and Twitch configuration.
9. Run npm.cmd test, npm.cmd run verify:source, typecheck, lint, build and synthetic browser E2E checks. Test MongoDB concurrency/authorization against a separately named disposable test database before live chat.

Required accounts for live mode: Twitch developer account and consenting test broadcaster/viewer, MongoDB Atlas, TypeSafe, Vercel and Git hosting. No Supabase account is needed. YouTube/Devpost are needed only for submission. The tool does not create accounts or widen database access rules automatically.

Missing configuration or a database/provider failure produces a visible error. No fake AI response or real moderation action is substituted. MongoDB URI, Twitch tokens, encryption/signing keys and TypeSafe key never belong in frontend environment variables or committed examples.
