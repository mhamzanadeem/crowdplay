# CrowdPlay Moderation

**Your AI co-moderator for a safer Twitch community.**

Submission draft — real integration/deployment evidence remains pending. Do not submit the implementation checklist as though it were completed.

CrowdPlay is a Twitch moderation workspace designed around a simple division of responsibility: AI detects and recommends; humans decide. A moderator can inspect original messages, nearby conversation, local repetition/flooding signals, Jev category distributions and prior decisions before taking action.

The project includes an overview dashboard, searchable/filterable moderation inbox, investigation drawer, viewer histories without guilt scores, configurable review rules, windowed analytics and privacy/budget settings. All demo data is labelled synthetic. Live mode is designed to use Twitch OAuth, signed EventSub webhooks, MongoDB Atlas and Jev typed Choice/Noul judgments, hosted on Vercel. Human-confirmed deletion uses message-bound, expiring confirmation tokens and a recorded intent/result audit. Timeout is disabled.

Our differentiator is the investigation workflow: keep ambiguous chat and community context visible, separate deterministic signals from model probabilities, allow dismissed flags, and keep decision ownership with moderators. We do not claim measured model accuracy yet.

Built with Codex in the primary chat: research, visual prototype, approved design, React/Next.js architecture, server/auth/database pipeline, tests and documentation. The third-party MIT Jev Chat extension by Ethan Rogers was studied as a technical reference; no source/prompts/assets were reused. New CrowdPlay source was created during this build.

Before final submission, replace this draft’s implementation intentions with tested behaviour and add:

- Repository URL: pending creation/push.
- Working Vercel URL: pending successful build/deployment/integration test.
- Codex session ID: user must run `/status` in primary chat.
- Public/unlisted YouTube demo URL: pending recording/upload.
- Testing access/setup: link docs/SETUP.md and provide an authorized judging path without secrets.

Current evidence: 22 unit tests passed; real database, Twitch, TypeSafe and deployment verification remain incomplete. See docs/IMPLEMENTATION_STATUS.md.
