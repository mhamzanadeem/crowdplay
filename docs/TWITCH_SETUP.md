# Twitch setup and OAuth architecture

Official sources inspected: [OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/), [chat auth](https://dev.twitch.tv/docs/chat/authenticating/), [chat EventSub](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage), [webhook verification](https://dev.twitch.tv/docs/eventsub/handling-webhook-events/), [subscriptions](https://dev.twitch.tv/docs/eventsub/manage-subscriptions/), [Helix deletion](https://dev.twitch.tv/docs/api/reference/#delete-chat-messages).

## Registration

Enable Twitch account 2FA and register a confidential web application in the Twitch developer console. Set Client ID/secret in server environment. Register the exact redirect URL: local `http://localhost:3000/api/twitch/callback`; production `https://YOUR_DOMAIN/api/twitch/callback`. TWITCH_REDIRECT_URI must match both the console and NEXT_PUBLIC_APP_URL origin.

The MVP supports a broadcaster connecting their own channel. It does not yet onboard independently delegated moderator accounts or a separate bot identity. Each broadcaster maps to one channel membership and encrypted token record.

## Flow and scopes

Login redirects to Twitch authorization-code flow with signed, random, ten-minute state bound to an HttpOnly SameSite=Lax cookie. Callback validates state, consumes cookie, exchanges code server-side, validates token client/user, fetches account identity and writes encrypted access/refresh tokens. A random session token is stored hashed in MongoDB; the browser gets only an HttpOnly cookie. No Twitch token enters client state or localStorage. Token use refreshes nearing expiry and validates at least hourly when accessed; concurrent refreshes use a database lock deadline.

Requested scopes:

| Scope | Why |
| --- | --- |
| user:read:chat | Authorize reading chat for the subscribing user |
| user:bot | Additional user authorization for cloud/app-token chat subscriptions |
| channel:bot | Broadcaster authorization for the app to subscribe to their chat |
| moderator:manage:chat_messages | Optional product capability: human-confirmed single-message deletion |

No email, chat sending, follower, ban or timeout scopes are requested. Deletion permission is included in the connection grant because the UI offers explicit deletion. Timeout is disabled rather than requesting moderator:manage:banned_users.

EventSub subscription creation uses a separate app access token from client credentials. The authorized broadcaster is both `broadcaster_user_id` and reading `user_id`. User and app access tokens are distinct; user consent grants the application rights needed for webhook subscriptions.

## Live connection

Deploy publicly with HTTPS first. Set a 10–100-character TWITCH_EVENTSUB_SECRET. Sign in, then Settings → Create / check chat subscriptions. Subscriptions: channel.chat.message v1 and channel.chat.message_delete v1. Callback: `/api/eventsub`.

The route verifies HMAC over message ID + exact timestamp + raw body with timing-safe comparison; rejects timestamps outside ±10 minutes; returns the exact challenge as plain text. Duplicate chat event IDs and message IDs are transactionally ignored. Unknown channel notifications are acknowledged without persistence. Revocations update the visible connection state. Check subscriptions replaces revoked subscriptions, but reports callback conflicts and pending verification honestly.

Send a harmless chat message from a consenting test viewer. Confirm stored message → processing → real model distribution → inbox recommendation where appropriate. No live connection was tested in the build environment.

## Deletion

Choose a consenting test viewer’s message younger than six hours. Open its context, click Delete, inspect viewer/channel/text, then explicitly confirm. Server validates membership, token scope, message binding and unused confirmation nonce; records intent; sends Helix DELETE with message_id always present. It never clears all channel messages. Broadcaster and other moderators’ messages are protected by Twitch; failures are recorded and shown. A delivery timeout has an unknown outcome and is never automatically retried.

Logout deletes the local application session. It does not revoke the Twitch grant or erase the channel’s database. Revoke authorization in Twitch when disconnecting permanently; subscription and data lifecycle controls beyond logout remain future work.
