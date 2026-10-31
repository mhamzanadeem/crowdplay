# Vercel deployment

Deployment is prepared, not performed. A production build, account access, live credentials and applied database are still required.

1. Fix npm registry access, run npm install and commit the generated lockfile after typecheck/lint/tests/build pass. Review dependency advisories. Repository currently contains no credentials.
2. Create a Git repository/remote under your account and push this project. Git changes to protected .git paths were not performed in the build environment.
3. Import into Vercel with framework Next.js and Node 24 (or supported >=22.18). Root directory is this checkout; use npm build script and the generated lockfile. No Render service is required.
4. Configure Atlas DB_URL and MONGODB_DB=crowdplay. Grant the application database user read/write access to crowdplay and allow the required deployment network access. Run npm run db:init, then the separate test-database isolation/concurrency suite before production chat. See MONGODB_SETUP.md.
5. Set environment variables from .env.example in Vercel. NEXT_PUBLIC_APP_URL must be the canonical production HTTPS origin. Configure exact TWITCH_REDIRECT_URI. Keys, secrets and service-role credentials stay server-side. Production cookie Secure is automatic.
6. Register the production callback URL in Twitch. Deploy, sign in as the broadcaster, then create/check EventSub subscriptions in Settings. Callback is `https://YOUR_DOMAIN/api/eventsub`.
7. Authorize TypeSafe processing in Settings, confirm pricing, enable classification. Send harmless test chat and inspect real stored results. Use a separately consenting viewer for a human-confirmed deletion test only after all checks pass.
8. Check `/api/health`, protected API rejection, session expiry, job retries and visible processing failures. Enable Vercel function error monitoring/alerts; no chat bodies or secrets in logs.
9. Verify deployed source/config contains no localhost callbacks; `.env.example` intentionally documents local development defaults, but production environment must override them.

`vercel.json` schedules `/api/jobs` daily. Set CRON_SECRET; Vercel authenticates requests with its Bearer value. Daily schedule fits the [documented Hobby cadence](https://vercel.com/docs/cron-jobs/usage-and-pricing). Ingress and an active dashboard also wake durable work. Idle retries can wait until daily recovery. If guaranteed rapid unattended retries/high throughput are needed, select and verify a durable queue or an eligible higher-frequency schedule before promising that service level.

Vercel [function limits](https://vercel.com/docs/functions/limitations) and [after/waitUntil](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#waituntil) were checked: background work shares invocation duration. Routes use 60-second maximums, 12-second Jev timeouts and durable database leases. Do not replace persistence with in-memory timers or assume an unlimited WebSocket server.

No deployment URL is available yet. Record it in submission materials only after the site actually builds, loads and passes integration checks. A private deployment-protection login must not obstruct authorized judging access.
