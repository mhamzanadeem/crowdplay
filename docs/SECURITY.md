# Security and privacy review

This is an implementation review, not a completed penetration test or production certification. Dependencies/build, remote MongoDB authorization and live OAuth were not testable in the build environment.

| Boundary | Implemented protection | Verification / remaining work |
| --- | --- | --- |
| Authentication | Signed ten-minute OAuth state; random hashed DB sessions; HttpOnly cookies | State cryptography tested; real OAuth and cookie behaviour pending |
| Authorization | Server-selected owner membership and channel-qualified reads/actions | Query review done; disposable DB isolation test written, not run |
| Database | Server-only native MongoDB access, explicit channel membership, unique indexes and transactions | Run db:init and the separate Atlas authorization/concurrency test before deployment |
| Secrets | Server-only clients; AES-256-GCM tokens, unique IVs; separate encryption/signing keys | Encryption/tampering tests pass; production bundle/history scan pending |
| EventSub | Limited raw body, timing-safe HMAC, ±10-minute timestamp, transactional duplicate handling | Cryptographic tests pass; challenge/replay on actual Twitch pending |
| Inputs | Zod API validation, byte limits, numeric ranges, fixed category/rule IDs | Source review; API handler E2E pending |
| CSRF | Mutating browser endpoints require exact configured Origin; JSON routes require JSON | Cross-origin integration tests pending |
| XSS | React escaped strings, no dangerouslySetInnerHTML, untrusted text is model data | Browser and CSP review pending |
| Abuse | Atomic MongoDB rate limits and transactional budget reservations | Budget/isolation DB test pending; deployment firewall/rate limits should be reviewed |
| Moderation | Explicit UI confirmation plus signed short-lived exact message binding; nonce consumed before API | Binding tests pass; real deletion and HTTP replay test pending |
| Audit | Separate intent/result/review inserts, no public database access; no original message text in automatic audit entries | Audit notes may contain personal data and expire under retention |
| Failure | No fake Jev result, no automatic moderation retry; unknown Helix outcomes clearly labelled | Controlled transport error tests pass |

Only a broadcaster connecting their own channel is supported. Do not claim delegated team moderation works. Timeout remains disabled and the associated scope is not requested.

Paid classification is opt-in and requires third-party processing consent. The service sends selected message text (possibly containing personal information) and limited context to TypeSafe. Pseudonymous author fields do not anonymize arbitrary message text. Do not send sensitive test data; use synthetic examples for evaluation.

MongoDB does not implement the prior PostgreSQL RLS policies or foreign keys. Browser access is forbidden; the server checks Twitch session ownership and channel predicates. A database account with credentials can bypass application checks, so grant only the required database privileges and restrict access to the backend environment. No Supabase key/JWT is used. DB_URL was removed from the example and preserved in ignored .env.local without printing it.

Operational requirements before production: verify locked dependencies/advisories, rotate independently generated keys, inspect production bundles for secrets, run two-channel isolation and confirmation tests, verify HTTPS/cookies/OAuth callbacks, check Vercel access/monitoring, test retention cleanup and provider budget failures. Error logs contain error types/job counts/token usage rather than credentials or chat bodies. Avoid logging OAuth query strings at a reverse proxy.

Known limits: no completed live integration/load test; bounded local context can miss patterns; polling/catch-up windows are limited; daily idle retries; no disconnect/account-erasure UI; no CSP nonce setup; provider cost reservation is estimated. A pending deletion intent can remain without a terminal result if the worker crashes after sending; inspect Twitch and the audit before creating another action.
