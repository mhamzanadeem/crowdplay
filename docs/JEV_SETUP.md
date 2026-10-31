# Jev / TypeSafe setup

Verified contract: [quickstart](https://docs.typesafe.ai/introduction/quickstart), [Choice](https://docs.typesafe.ai/primitives/choice), [confidence](https://docs.typesafe.ai/confidence). Source model and API availability still require an account test.

Set TYPESAFE_API_KEY server-side. Default model is jev-1.13.0 for reproducibility; confirm it is available in your account or select a supported ID with JEV_MODEL. Set JEV_INPUT_USD_PER_MILLION and JEV_OUTPUT_USD_PER_MILLION to verified current account prices. Blank values pause classification. No historical reference-project price is assumed to be current.

In Settings, authorize third-party chat processing, enable classification and set the hourly estimated budget. Existing paused jobs are requeued when preferences are saved. New messages still retain local-rule signals when AI is paused.

Requests POST to `https://api.typesafe.ai/v1/systemone` with Bearer auth and model/state/questions. Each message gets a Choice category plus two Noul judgments (attention, targeted person). Context is capped at 12 messages, text at 500 characters per message and request at 58 KB. The model receives pseudonymous author fields; raw message text may contain real usernames or personal information. No video is sent.

All Choice options and normalized finite probabilities are validated, as are confidence and Noul outputs. Missing usage is retained as an uncertain reservation and disables further classification until reviewed. Provider failure never creates a fake judgment. Review explanations are application policy/local evidence rather than invented generated prose.

The server-only `/api/classify/test` POST is authenticated, same-origin, rate-limited, budget-reserved and makes one real synthetic test request. It returns model, latency and usage, not secrets. It has not been called with real credentials. The regular `/api/classify` POST wakes pending work; neither endpoint can punish a viewer.

Budget reservations are serialized across workers through MongoDB transactions that write the channel’s shared settings document. Unknown outcomes remain reserved; timeouts/rate limits may be retried by jobs with exponential backoff, at most five attempts. The byte-based reservation is an estimate, not a guaranteed TypeSafe billing ceiling. Provider account spending limits remain the final financial control. If actual cost exceeds reservation, or usage is absent, AI processing disables itself. Check provider usage before re-enabling.

Cache keys include channel, requested model, rule configuration, exact messages and context. Filters use stored distributions and never call Jev. Different conversational contexts are not treated as interchangeable duplicates.

A failed/paused message can be explicitly requeued from its investigation drawer after fixing configuration or service failures. Retry consumes the same channel budget, does not release earlier uncertain reservations, and cannot send a Twitch moderation action.
