# CrowdPlay Moderation — hackathon research

Inspected 2026-10-31. Sources are linked below; community reports are anecdotes, not policy. No eligibility guarantee is given.

## Event, prizes and deadline

[Official overview](https://twitchcon-codex.devpost.com/) describes a Codex-built interactive Twitch experience. Awards: first $10,000, second $6,000, third $4,000, two runners-up $2,500 each; total $25,000. All five receive Codex Booth stage time at TwitchCon San Diego, November 15.

[Schedule](https://twitchcon-codex.devpost.com/details/dates): submissions October 23, 2026, 10 AM PDT to November 2, 2026, 2 PM PST. Conversion: November 2, 22:00 UTC = **November 3, 2026, 03:00 Asia/Karachi (PKT)**. Pacific daylight saving has ended by November 2; use UTC−8, not UTC−7. Verified independently using Windows timezone conversion (see task log).

## Official rules checklist

[Rules, sections 1–15](https://twitchcon-codex.devpost.com/rules), all reviewed:

- Age: 18 or local majority, whichever older. Individuals/teams allowed; organizations excluded.
- Exclusions include Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea, sanctions and conflicts involving organizers/judges/families/affiliates.
- Pakistan is not named; entrant must confirm residence, sanctions, banking eligibility directly with Devpost.
- New submission-period work; authorized integrations; licensed open-source enhancements allowed. Preserve ownership/attribution.
- Join, complete fields, submit before deadline. Repository, English description, Codex session ID, functioning Twitch video under three minutes; free unrestricted judging access required.
- Four equally weighted criteria; innovation breaks ties first.
- Entrants retain IP; judging/publicity permissions apply.
- Winner identity, eligibility, contribution and affidavits verified; forms due within ten business days; payment within 60 days after forms. Taxes/fees/banking compliance are winner responsibilities; W-8BEN may apply. Travel self-funded; absence preserves cash.
- Drafts are not final entries; later changes restricted. Releases, publicity, disqualification, arbitration/New York law, Devpost terms/privacy apply. Rules prevail over inconsistent pages.

## Discrepancies and entrant confirmations

Rules list judging November 5–15; schedule lists November 3–6. Keep judging access through November 15 and request organizer clarification. This discrepancy does not change the published submission deadline.

Unknown entrant facts: age, residence, team members, organizer affiliations, payment eligibility and tax status. Confirm directly before entry; do not infer these from the workstation timezone. No source-code reuse is proposed, avoiding an unnecessary ownership dispute. No known project-specific disqualifying condition established so far.

## Updates and submission checklist

[Official updates](https://twitchcon-codex.devpost.com/updates) inspected: final-weekend reminder requires actual running Twitch footage and Codex build footage; unlisted YouTube accepted, private rejected. Upload early for processing. Earlier updates recommend scoping to a community need and exploring Twitch tooling.

[Official resources/FAQ](https://twitchcon-codex.devpost.com/resources) inspected. Checklist for handover:

- [ ] Entrant eligibility confirmed and hackathon joined.
- [ ] Original work and dependency licence records retained.
- [ ] Working Twitch-connected product; credentials available for permitted judging tests.
- [ ] Repository accessible with source/assets/setup; no secrets.
- [ ] Description explains features and Codex usage.
- [ ] Run `/status`; save primary Codex session ID.
- [ ] Under-three-minute public/unlisted YouTube video, real Twitch and Codex footage, cleared media rights.
- [ ] Submit on Devpost and verify submitted status, rather than leaving a draft.

## Judging strategy — our design proposal

| Criterion | CrowdPlay evidence to produce |
| --- | --- |
| Innovation / Idea | Context and repetition investigation, uncertainty disclosure, full distributions, human-only decisions |
| Potential Impact | Timed review exercise and measured false positives using synthetic labelled chat |
| Technological Implementation | Real EventSub → database → Jev → review queue; replay tests, channel isolation, cost controls, Codex history |
| Design | Calm dense inbox, obvious original message/context, keyboard-friendly investigation, explicit confirmation |

No accuracy, cost, latency or time-saving claims until measured on this application.

## Search and community findings

Searches executed: `Codex TwitchCon hackathon 2026`, `site:reddit.com "Codex" "TwitchCon" hackathon`, `site:reddit.com "Codex x TwitchCon"`, `site:reddit.com/r/Twitch moderation automod false positives spam`, `site:reddit.com/r/streaming moderation spam bots`, `site:reddit.com/r/ChatGPT Twitch moderation`. Direct Google results URL was attempted but inaccessible; web search was used instead. Do not describe that as a successful Google inspection.

No relevant Reddit discussion of this exact hackathon was verified. No useful r/ChatGPT-specific moderation evidence was verified. Search coverage is not proof that none exists.

- [r/Twitch AutoMod discussion](https://www.reddit.com/r/Twitch/comments/1tmwlje/honest_question_does_automod_actually_work_for/): community-specific language and contextual false positives are raised; a reply mentions customizable Streamlabs filtering. Small self-selected sample, not measured product performance.
- [r/Twitch bots/scammers](https://www.reddit.com/r/Twitch/comments/1q6jjah/botsscammers/): search result inspected; streamer complains about promotional conversations. Full thread not independently audited.
- [r/streaming bot-viewer thread](https://www.reddit.com/r/streaming/comments/1jve15m): search result inspected; mostly a joke and subreddit automation response, weak evidence for Twitch moderation needs. Not used as validation.
- [Hired Creative listing](https://hiredcreative.com/opportunities/425-codex-x-twitchcon-hackathon) and [BuildJams listing](https://jams.shippedby.app/claude-cursor-codex-hackathons/) appeared in inspected search results; not authorities for rules.

## Existing products and limitations

[Nightbot spam protection](https://docs.nightbot.tv/control-panel/spam-protection) documents word/phrase, caps, emote, link, symbol and repetition controls. Inference: these configurable mechanisms are useful but do not by themselves establish conversation-level intent. No claim that all Nightbot capabilities are keyword-only.

[Twitch AutoMod API](https://dev.twitch.tv/docs/api/reference/#check-automod-status) exposes moderation/held-message operations. AutoMod already has human review; human control alone is not a novel differentiator. CrowdPlay must demonstrate investigation context, independent behaviour signals and review/cost transparency. No unverified claim that AutoMod automatically bans users.

The [Jev reference](https://github.com/ethanplusai/jev-chat-for-twitch) selects readable chat, rather than providing a shared persistent moderation workspace. See separate audit.

## Verified architecture constraints

- [Twitch chat authentication](https://dev.twitch.tv/docs/chat/authenticating/) and [channel.chat.message](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage): webhook supported. App-token subscription requires user:read:chat plus user:bot authorization for the reading user and broadcaster channel:bot authorization or moderator status. Separate user authorization grants from app tokens; do not request user:write:chat just to read.
- [OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/): server authorization-code flow is the proposed approach; exact implementation and refresh/validation tests belong after design approval.
- [Helix deletion](https://dev.twitch.tv/docs/api/reference/#delete-chat-messages): moderator:manage:chat_messages; always supply message_id to avoid room-wide clearing. Permission alone does not authorize an action: every action needs a human confirmation. Timeout is deferred unless validated and tested.
- [EventSub verification](https://dev.twitch.tv/docs/eventsub/handling-webhook-events/): HTTPS 443, HMAC over ID + timestamp + raw body, replay rejection and duplicate handling; acknowledge promptly after durable acceptance.
- [Vercel limits](https://vercel.com/docs/functions/limitations): Fluid defaults 300 s; Hobby max 300 s, Pro/Enterprise generally 800 s (extended beta conditional). Request/response payload 4.5 MB. Set much smaller application payload limits. No long-running in-memory queue design.
- [Vercel after/waitUntil](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#waituntil): background work shares invocation timeout. Proposal: persist jobs transactionally, then bounded after() processing; durable retry/lease recovery must be designed and verified at Task 23. after() alone is not a durable queue. Supabase stores shared state and Realtime updates, with channel RLS. No alternate host needed at this stage.

## Eligibility and delivery risks

Missing real Twitch connection, misrepresented demo probabilities, inaccessible judging app, licence violations, pre-period work presented as new, leaked credentials, late/private video, forgotten submission, or unsupported entrant identity/payment could invalidate the entry. Prototype is not submission-ready. No real external integrations have been tested yet.
