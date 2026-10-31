# Testing and evaluation



## Executed here



`npm test`: 22 tests passed on Node 24.18.0. Built-in Node TypeScript stripping avoids npm dependency requirements for core tests.



Coverage: token encryption/tampering, signed state expiry/modification, exact action bindings, EventSub raw-body HMAC and old/future timestamps, repetition/flood/link/caps/promotional signals, innocent banter, aggregate viewer history, bounded Jev request shape, validated probability distributions, controlled successful transport, authentication errors/rate limits/invalid JSON/network failures. Controlled provider responses are test fixtures, not evidence of live Jev connectivity.



`node scripts/verify-source.mjs`: TypeScript (not TSX) syntax parsing, local-import resolution and JSON configuration checks passed. This does not replace tsc or a Next build.



`npm run test:database`: one integration test skipped without a separate MongoDB test-database opt-in. `npm run evaluate`: 16 labelled examples loaded, zero provider calls. No accuracy, latency or cost measured.



`npm run typecheck`, `npm run build` failed to start because tsc/next were absent after npm install failed with registry DNS ENOTFOUND. ESLint/browser E2E not executed. No successful production build or rendered verification is asserted.



## Required after dependencies install



```powershell

npm run typecheck

npm run lint

npm test

npm run build

npx playwright install chromium

npm run test:e2e

```



Playwright tests deliberately mock workspace authentication to stay in synthetic demo mode and cannot send real moderation actions. They cover desktop/mobile navigation, search empty state, persisted rule changes and cancelled/confirmed demo review. Tests are written, not run. Prior browser preview access was declined; no alternate browser route was used to work around that decision.



## MongoDB authorization, concurrency and accounting



See MONGODB_SETUP.md. Set CROWDPLAY_RUN_DATABASE_TESTS=1 and MONGODB_TEST_DB=crowdplay_test_<suffix> in a local shell with DB_URL configured, then run npm.cmd run test:database. The runner rejects the live database name and requires an explicitly separate test DB. No psql or SQL migrations are used.



The test creates two synthetic accounts/channels and verifies channel denial, concurrent duplicate ingestion without orphan jobs, competing budget reservations, exclusive job claims, stale lease rejection and duplicate deletion intents. It sends no Twitch/TypeSafe request. Cleanup is limited to this run’s documents in the separate test database; no database is dropped. This real integration test has not run because MongoDB dependencies cannot yet be installed.



Additional dependency-free guard tests exercise missing-membership rejection before a message read and stale-lease rejection before a classification write, plus URI/database-name configuration. These use injected native-client stubs and do not prove live Atlas transactions or database permissions.



## Real integration checks



Follow Twitch/Jev setup with a consenting dedicated test channel. Verify OAuth success and rejected state, refresh/expiry, webhook challenge and bad signatures, duplicate event counts, live message appearance, real distributions, budget/provider errors, interrupted job recovery, session expiration and channel isolation. Confirm no Helix call before confirmation; use one explicitly approved disposable chat message for deletion. Do not automate real moderation actions.



## Labelled model evaluation



Dataset: tests/fixtures/evaluation.json (16 synthetic messages). Includes normal chat, feedback, banter, sarcasm, quotation, spam, repeat promotion, suspicious link, harassment, threats, ambiguity and prompt injection. Labels are starter judgments; expand and independently review before claiming quality.



After setting TYPESAFE_API_KEY, current input/output prices and an EVALUATION_BUDGET_USD limit, run `npm run evaluate -- --live`. This explicitly spends provider usage. Script writes docs/evaluation-results.json with precision, recall, false-positive/negative rates, category accuracy, per-example latency and estimated cost; denominator-zero rates are null. An absent usage field or exceeded cost estimate stops further calls. No moderation API is used. Small synthetic results are not production quality guarantees.



## Publishing checkpoint

Dependencies and package-lock.json are now present. Full npm run typecheck and npm run lint pass. Fixed an unmatched brace in Playwright config, a MongoDB replacement-document type error, and initial refresh scheduling identified by ESLint. Default build fails in Turbopack process/IPC setup; next build --webpack fails with EPERM creating generated .next/types. Browser E2E and Atlas integration remain unverified. These failures are not reported as passing builds.
