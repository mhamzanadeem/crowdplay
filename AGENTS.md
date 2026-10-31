# CrowdPlay engineering instructions

The user approved the design on 2026-10-31. Continue the original app rather than replacing the approved prototype aesthetic.

Keep UI, pure moderation policy, Jev transport, Twitch, session/auth and database code separated. Use shared domain/database types. Never expose credentials or write real tokens to repository files. Keep demo distributions explicitly synthetic.

AI may only recommend review. Every real deletion requires the exact human-confirmation workflow; no auto-ban/timeout/delete/warning. Timeout is disabled. Do not automate real moderation actions in tests.

Run npm test after core changes. Run npm run verify:source, typecheck, lint and build when dependencies are installed. Browser E2E uses synthetic data; real integration requires a disposable/consenting test channel and dedicated test database. Do not mark skipped or blocked checks as successful.

Registry DNS initially prevented installation. The user has since installed dependencies and generated package-lock.json. TypeScript and ESLint now pass; production builds still hit sandbox IPC/EPERM errors. Read docs/IMPLEMENTATION_STATUS.md before claiming completion. Review the reported dependency advisories before production. Root .git writes are denied; isolated publishing metadata lives in ignored .publish-git.

Server uses a custom Twitch session and MongoDB Atlas through server-only native-driver access. DB_URL belongs only in ignored .env.local; examples contain placeholders. Every channel operation must preserve explicit membership/channel predicates. MongoDB has no PostgreSQL RLS: browser database access is forbidden. Preserve transactional event/message/job idempotency, unique confirmation indexes, budget serialization and job-lease completion tokens. PostgreSQL files in docs/archive are historical only.

Record material changes in docs/DECISIONS.md and verification status in docs/IMPLEMENTATION_STATUS.md. Keep this primary Codex chat for provenance. Never invent a repository/deployment/video URL or submitted Devpost state.
