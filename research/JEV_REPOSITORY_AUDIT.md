# Jev Chat for Twitch — source audit

Inspected 2026-10-31 through GitHub connector after local git clone failed (DNS). Repository: https://github.com/ethanplusai/jev-chat-for-twitch, default main branch. Not a pinned commit audit; re-pin before any future reuse. No upstream source copied into application files.

## Ownership and licence

[LICENSE](https://github.com/ethanplusai/jev-chat-for-twitch/blob/main/LICENSE) verified: MIT, Copyright (c) 2026 Ethan Rogers. It is third-party work, not the entrant's original extension. Any future source reuse must include the copyright and full permission notice in copies/substantial portions, document exact files/changes, and satisfy hackathon enhancement/original-work requirements. MIT permission is not a hackathon eligibility guarantee. Current choice: independently implement CrowdPlay; no source reuse proposed.

## Architecture and file inventory

All listed source files fetched and read; media files enumerated, not treated as implementation evidence. Each path links under [repository main](https://github.com/ethanplusai/jev-chat-for-twitch/tree/main).

| File | Responsibility |
| --- | --- |
| README.md | Installation, BYOK, disclosure, costs, operation and development |
| package.json | Dependency-free ES modules, Node >=22, node:test and pack scripts |
| extension/manifest.json | MV3, storage permission, narrow Twitch/IRC/TypeSafe host permissions, module worker, injected entry point |
| extension/content.mjs | Dynamically imports panel via extension URL |
| extension/panel.mjs | UI, SPA channel switching, IRC intake, 150 ms pump, batches, decisions, filters, pause-on-scroll, detail popovers, status cards |
| extension/panel.css | Extension panel layout/palette, native chat narrowing styles |
| extension/irc.mjs | IRCv3 tag escapes/parser, PRIVMSG shaping, removals, channel validation, anonymous reconnecting socket |
| extension/jev.mjs | Exact HTTP implementation, validation, request shaping, Batcher, spend windows, test key |
| extension/background.mjs | Reads key, dispatches Jev, concurrency/spend controls, sanitized settings and error replies |
| extension/chat-policy.mjs | Versioned categories, thresholds, pure selection policy; separate preview heuristic |
| extension/options.html / options.mjs | Masked key field, rate/spending settings and test key action |
| scripts/pack.mjs | Dependency-free stored ZIP construction with CRC32; packages extension folder |
| tests/extension.test.mjs | node:test suite covering parsing, normalization, batching, distributions, spend persistence, worker settings, local filters, manifest |
| docs/how-it-works.md | Pipeline, file map, disclosures, measurements and limitations |
| docs/demo.gif, demo.mp4, screenshot.png | Demo media; not reused |

Sources: [extension directory](https://github.com/ethanplusai/jev-chat-for-twitch/tree/main/extension), [tests](https://github.com/ethanplusai/jev-chat-for-twitch/blob/main/tests/extension.test.mjs), [packer](https://github.com/ethanplusai/jev-chat-for-twitch/blob/main/scripts/pack.mjs), [technical notes](https://github.com/ethanplusai/jev-chat-for-twitch/blob/main/docs/how-it-works.md).

## Exact Jev call and verified contract

[extension/jev.mjs](https://github.com/ethanplusai/jev-chat-for-twitch/blob/main/extension/jev.mjs): `JevBrowserClient.ask(state, questions)` calls fetch with POST https://api.typesafe.ai/v1/systemone, Bearer authorization, JSON content type, body containing model/state/questions. Reference pins jev-1.13.0. `pingJev` separately sends a tiny Noul question; it does not reuse the Choice answer validator.

`buildChatRequest` accepts 1–24 messages (normal batch 20); each gets a message_i Choice question with type/instructions/criteria. Shared state includes channel, streamTitle, last 12 message texts and shaped messages (id, at, author <=40 characters, body <=500). Scope marks chat untrusted and excludes video. Instructions forbid following embedded chat instructions or assuming chat claims are true. They mention currentScene although request state does not supply it: a concrete context mismatch.

Returned `answers` indexed by question ID include type, choice, confidence, probabilities; model and usage are read separately. Validator checks required IDs, matching types, valid finite probabilities and confidence, exact category keys, sum within 0.025 of one, selected category within 0.001 of the maximum. Token usage requires nonnegative safe integers. Returned model is validated or falls back to requested model.

[Current TypeSafe quickstart](https://docs.typesafe.ai/introduction/quickstart) independently confirms endpoint, Bearer header, model/state/questions, answer map and usage fields. It uses jev-latest in requests. [Choice docs](https://docs.typesafe.ai/primitives/choice) confirm full normalized distribution and confidence derived from its spread. Choice is a closed set, not generated explanations. Probability of one category and distribution confidence are different. [Introduction](https://docs.typesafe.ai/introduction) confirms Choice/Score/Noul; do not force arbitrary prose into these types. Verify available model/pricing for the account before implementation; reference constants are not current billing guarantees.

## Pipeline and local policy

Anonymous IRC WebSocket → parsed original message → rate admission → size/age batch → worker → Jev → validated answer map → in-memory decisions keyed by message ID → pure disposition policy → selected rows/detail distribution.

Categories are question, insight, feedback, reply, humor, reaction, spam, off_topic, unsure. This is readability selection, not a complete moderation taxonomy. Policy sums selected probabilities: commonly threshold 0.6, focused 0.75; uncertainty includes unsure >=0.3 or intermediate target probability. Changing an intent reruns policy over stored distributions, not Jev. Last 300 rendered rows / 500 decisions bounded in memory. CLEARMSG/CLEARCHAT remove rows. The preview heuristic exists in chat-policy but is not a legitimate fallback AI response.

## Batching, cost and errors

Default 20 messages / 800 ms; token-bucket admission default 10 messages/s. Maximum two requests concurrently. Overflow is unassessed, not a fabricated result. Body budget 58,000 UTF-8 bytes. Timeout 9 seconds; at most two attempts by default. Retries transient 429/529/503 (bounded Retry-After), plus transport failure; authentication fails clearly. Redirects forbidden. Invalid JSON/distributions rejected.

Rolling one-hour spend entries survive worker restarts in chrome.storage.session, fallback local. Cap default $0.50; options clamp cap and rate. Reference estimate uses $0.042/million input tokens, zero output charge. This is a source constant, not a verified current tariff. Actual usage returned by successful response drives estimate; no usage records zero. Test-key request bypasses judge cap. Two in-flight requests can overshoot; no pre-call budget reservation. A timeout/retry may have consumed billable provider work without recorded usage. Storage writes are best effort. Therefore this is not a strict financial ceiling or a distributed accounting system.

## Security observations and limitations

Key stays in extension local storage/worker, outside page context; content receives hasKey rather than key. Untrusted chat rendered with textContent, color validated, input trimmed, no remote executable code, default extension CSP. This reduces page injection risk, but local browser profile compromise can expose stored key. Chat usernames/text/context leave machine for TypeSafe; do not confuse extension isolation with server secret management.

No cloud auth, multi-tenant RLS, durable review/audit log, OAuth refresh, signed webhooks or human-confirmed Helix actions. Socket remains on user's machine; not suitable as Vercel server architecture. Current tests cover pure logic and Chrome mocks; they do not establish live Jev accuracy, billing guarantees, webhook security or cross-channel isolation. Tests inspected, not run locally (clone unavailable); no claim of passing upstream suite.

## Independent implementation plan

Retain concepts: shared state with typed questions, bounded context, normalized answer validation, stored complete distributions, pure local policy changes, visibly unassessed errors, transparent budget pause.

Write new TypeScript domain models, server-only client, moderation taxonomy, deterministic repetition/flood signals, durable jobs and accounting with reservations, Supabase schema/RLS, OAuth/EventSub, human review and immutable action results. Cache keys must include channel, context, rules, policy and model version; identical text in a new context is not necessarily an identical decision. Never copy prompts, UI, assets, code or tests without revisiting licence and documenting reuse.

Verification: source contract cross-checked against official TypeSafe quickstart/Choice documentation; file inventory reviewed; licence ownership verified. Outstanding: pin upstream SHA, current account pricing/model availability and real credentialed API test after approval.
