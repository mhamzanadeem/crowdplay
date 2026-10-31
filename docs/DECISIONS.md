# Decisions



2026-10-31 — Tasks 0–2 only are authorized before explicit design approval. No Next.js scaffold, migrations, Twitch connection or Jev connection before that gate.



Use C:\CrowdPlay as the project root (workspace initially empty, not a Git repository).



Reference Ethan Rogers' MIT extension through read-only source inspection. Independently write CrowdPlay. Do not vendor reference source or reuse media.



Prototype: buildless local HTML/CSS/JS, no external assets or dependencies, explicit synthetic data. Production stack remains Next.js/TypeScript/Tailwind/shadcn/Lucide/Supabase/Recharts/Vercel after approval. Sites hosting is not used because the user requested local preview and Vercel production hosting.



Proposed production intake: EventSub webhooks, durable transactional acceptance, bounded separate AI work, RLS and Realtime. No persistent in-process message queue. after() cannot replace durable retry records. Final worker/recovery design belongs to Task 23.



Only humans initiate real moderation actions after confirmation. No model-generated prose is implied by Jev Choice outputs. UI explanations should identify application policy and actual available evidence.





2026-10-31 — User explicitly approved the design and requested end-to-end implementation. The prior Task 2 gate is satisfied. Implementation source was added for the approved application, with verification blockers recorded rather than represented as passes.



Registry DNS (ENOTFOUND registry.npmjs.org) blocked npm installation. Dependency-free Node tests were used for pure contracts/security, not as a substitute for a Next.js build or browser testing. No lockfile or deployed working URL exists yet.



Use custom server-only Twitch authorization-code OAuth and random hashed database sessions for the broadcaster-only MVP. Supabase is accessed through channel-qualified server queries. Browser Supabase Realtime is deferred in favour of authenticated polling every three seconds; do not expose service credentials to bridge custom sessions into a browser client.



Queue intake is transactional and eligible after 800 ms. Ingress, an active dashboard and a daily Vercel cron wake leased batches; idle-channel retries can wait for the daily recovery. This avoids a persistent server or mandatory paid cron, but high-throughput/delivery guarantees require later verification.



Jev uses closed-set Choice and Noul judgments. Full validated distributions are cached/stored; context-sensitive cache keys include channel, model, rules and exact state. Reserved cost is explicitly estimated; unknown outcomes hold reservations and missing/underestimated usage disables AI. Account-level provider spending controls remain necessary for a true financial ceiling.



Single-message deletion uses an expiring signed actor/channel/message/text binding and a consumed nonce, with intent/result inserts before/after Helix. Timeout, delegated team onboarding, custom blocked terms/spoilers, full historical pagination and advanced analytics are deferred. No automatic punitive action exists.



Retain chat, classification and potentially sensitive review notes under per-channel 1–30-day settings. Daily cleanup is eventual, not an immediate erasure SLA. Operational/usage metadata is kept seven days.





2026-10-31 — User explicitly requested MongoDB Atlas instead of Supabase/PostgreSQL. This supersedes earlier database/RLS decisions above. Native MongoDB driver, server-only DB_URL, explicit MONGODB_DB=crowdplay and no Supabase dependency are now used. The supplied URI was found in .env.example (not .env.sample), preserved in ignored .env.local with database path/appName set to crowdplay, and removed from the example. No credentials were printed.



Transactions replace SQL RPCs for event/message/job ingestion, moderator decisions/configuration, lease-bound completion and serialized budget reservations. Atomic findOneAndUpdate claims jobs; unique indexes cover event IDs, channel/message and confirmation intents; BSON TTL indexes and read predicates implement expiry. Classifications embed in message documents; viewer history aggregates the message window. There is no MongoDB RLS or browser database credential. Application session/membership checks are essential.



Historical PostgreSQL scripts/status were moved to docs/archive/postgres after verifying source/destination paths remain under C:\CrowdPlay. No remote SQL database was configured or migrated. MongoDB integration tests require a separately named crowdplay_test_<suffix> database and remove only their own documents. npm DNS still blocks driver installation and real connection verification. The existing custom SESSION_SECRET is still required; no external JWT provider/secret is needed.



2026-10-31 � User requested publishing all source to https://github.com/mhamzanadeem/crowdplay.git on main with at least 25 commits. Group source into meaningful feature/documentation commits; do not create empty commits or rewrite dates. Preserve any existing remote history and do not force push. Secrets, node_modules, generated builds and publishing metadata are excluded.

The user installed dependencies. TypeScript and lint checks exposed small issues in Playwright syntax, MongoDB cache replacement typing and initial workspace refresh; fixed them before publishing. Root Git metadata is read-only to this agent, so use ignored .publish-git for isolated commit preparation and bundle export. Native Git network DNS and connected-account repository access currently block remote verification/push.
