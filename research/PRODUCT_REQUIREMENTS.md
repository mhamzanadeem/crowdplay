# CrowdPlay Moderation — product requirements

Task 1, 2026-10-31. Tagline: Your AI co-moderator for a safer Twitch community.

## Personas and problems

Streamer: keep a welcoming channel while focusing on the broadcast; wants clear connection/budget status and control of channel norms.

Volunteer moderator: cannot inspect every fast-moving message; needs a prioritised queue, original text, surrounding conversation and reversible review decisions.

Lead moderator: needs channel-specific rules and an attributable history to resolve disagreements and spot repeated behaviour without labelling a person guilty.

## Main workflows and acceptance

1. Connect channel through least-privilege OAuth; distinguish authorized, subscribed, receiving and AI-ready states. Benefit: failures are visible rather than a misleading green connected badge.
2. Receive signed Twitch events, store idempotently, classify using bounded context and local signals. Benefit: dependable review coverage and honest unassessed states.
3. Search/filter the queue without new AI calls. Select message → read original/context/probabilities/rule evidence → mark safe, dismiss or confirm violation. Benefit: quick informed human decisions.
4. Human chooses deletion → confirmation names channel, viewer and original message → server rechecks authorization → result appended to audit. Benefit: accountable action with no AI punishment.
5. Adjust channel rules independently of model outputs; persist changes and audit. Benefit: community norms stay under human control.
6. Inspect viewer message/review history without aggregate guilt scoring. Benefit: evidence of patterns without prejudicial ranking.
7. Inspect retention, third-party processing disclosure, budget and provider failure states. Benefit: clear data and cost control.

## MVP and user benefit

| Priority | Feature | Benefit / completion evidence |
| --- | --- | --- |
| P0 | One real channel, secure login + webhook | Live Twitch messages appear once in the correct workspace |
| P0 | Local repetition/flood detection + real Jev Choice classifications | Model judgments and deterministic evidence remain distinguishable |
| P0 | Inbox + drawer + context + complete distribution | Moderator can understand and dismiss a flag |
| P0 | Human reviews with attributable persistent log | Decisions survive refresh and identify responsible moderator |
| P0 | Server secrets, RLS, signature/replay tests and budget pause | Minimum safety and isolation necessary for live demo |
| P0 | Vercel URL, setup docs and working video | Judges can see and reproduce the experience |
| P1 | Human-confirmed single-message deletion | Close review loop if permissions and integration tests pass |
| P1 | Basic overview, viewers, rules and analytics | Operational visibility derived from shared stored data |
| Later | Timeout, richer analytics, collaborative assignment, exports | Added only after core ingestion/review works |

## Schedule and scope controls

Deadline November 3, 2026, 03:00 PKT. Proposed target: design approval October 31; November 1 core ingestion/classification/review; November 2 deployment, tests, recording and submission with several hours of upload buffer. This is conditional on timely approval and credentials, not a guarantee. Follow numbered tasks in order; keep intermediate analytics minimal so integrations retain time. If end-to-end tests cannot pass, disclose incompleteness and do not fabricate a live demo.

No advanced analytics, multi-channel UI, billing, custom model training or timeout on the critical path. Required accounts after approval: Twitch developer application and consenting test channel, TypeSafe API access, Supabase project, Vercel account and repository. Missing credentials permit mocks/tests but cannot establish real connectivity.

## Non-goals and invariants

No auto-delete, auto-ban, auto-timeout or auto-warning. No user guilt score, generated confidence or substituted AI output on failure. No Chrome extension, video analysis, global viewer tracking or claim to own the reference project. No production backend before design approval.

All synthetic content and probabilities labelled demo; real provider confidence must not be confused with a category probability. No claim that a numerical probability proves misconduct. Missing context must be shown. Human review state separate from Twitch API success/failure. Secrets server-only; minimum chat disclosure to TypeSafe, configurable retention and channel isolation required.

## Judging strategy

Innovation: context plus recurrence evidence in a shared investigation workflow. Impact: evaluate false positives and review time, disclose sample limits. Implementation: real Twitch → Jev → inbox on Vercel with reproducible tests and Codex provenance. Design: accessible dark workspace, clear scanning hierarchy and explicit decisions. Research authority and source URLs in HACKATHON_RESEARCH.md; implementation details in JEV_REPOSITORY_AUDIT.md.

## Task 2 prototype acceptance

Six navigable views: overview, inbox, users, rules, analytics and settings. Inbox search/filter/sort, drawer context/distributions, local-only demo decisions with confirmation, viewer history, rule toggles and sensitivity, analytics labels and responsive layout. No network APIs or credentials. Settings explain disconnected integrations. Approval must be requested with the actual artifact available.

Verification: each MVP item has a user benefit and observable completion condition; deferred scope explicit; feasibility conditional on credentials/deadline; no extra critical-path features.
