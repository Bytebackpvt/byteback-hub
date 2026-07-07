## Phase 2E — Gmail (read + send), per user

Each user of your app needs to connect **their own** Gmail (not yours), so I'll build a custom Google OAuth flow. The Lovable Gmail connector goes to your account only, so it's not the right fit.

## What I'll ship this turn

### 1. Generic OAuth connections framework
New table `oauth_connections` (workspace + user scoped) with columns for provider, account email, encrypted `access_token` / `refresh_token`, `expires_at`, granted `scopes`, `status`. RLS: users manage only their own rows; service role for the refresh worker. Tokens encrypted with `pgcrypto` using a `TOKEN_ENC_KEY` secret so a leaked DB row can't be replayed.

### 2. Google OAuth wiring
- Public route `src/routes/api/public/oauth.google.callback.ts` — receives `?code`, exchanges for tokens, stores encrypted, redirects back to `/app/integrations?connected=gmail`.
- Server fn `startGoogleOAuth` — returns the Google consent URL with `state` (signed HMAC of user + workspace + nonce) and scopes `gmail.readonly`, `gmail.send`, `gmail.modify`, `userinfo.email`.
- Server fn `refreshGoogleToken` — refreshes when `expires_at` is near.
- Server fn `disconnectGoogle` — revokes at Google + deletes row.

### 3. Gmail server functions
- `listGmailThreads({ mailbox })` — recent inbox threads with subject/from/snippet.
- `getGmailThread({ id })` — full message bodies + headers.
- `sendGmailReply({ threadId, to, subject, body, inReplyTo })` — builds RFC 2822, base64url, `POST /messages/send`.
- `markGmailRead({ id })` — removes `UNREAD` label.

All call the Gmail REST API directly with the user's own access token, auto-refresh on 401.

### 4. UI on the Integrations page
Gmail card flips from "Coming soon" → "Connect Gmail" (opens Google consent in new tab). Once connected shows account email, "Test send", "Disconnect".

### 5. Inbox integration
When a Gmail connection exists, Inbox surfaces a **Gmail** mailbox alongside Instantly — reads real threads, reply composer sends via `sendGmailReply`.

## What you'll need to provide

Google OAuth client credentials from Google Cloud Console:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- Authorized redirect URI to paste into Google console:
  `https://project--cc239d7b-1706-4226-973f-f2f4c63de486.lovable.app/api/public/oauth/google/callback`

I'll also auto-generate a `TOKEN_ENC_KEY` (never leaves the server).

## Technical notes (safe to skip)

- OAuth `state` = HMAC(`user_id|workspace_id|nonce|ts`, `SESSION_SECRET`) with 10-minute TTL to prevent CSRF and cross-workspace binding.
- Refresh happens lazily inside each Gmail server fn: if `expires_at - now < 60s`, refresh, save, retry once on 401.
- Token encryption uses `pgcrypto.pgp_sym_encrypt(token, key)`; migration installs the extension in the `extensions` schema (Supabase default).
- The framework table is generic enough to plug in Outlook, Slack, HubSpot next turn — only the provider-specific server fns and callback change.

## Out of scope this turn

- Outlook, Slack, HubSpot (framework will support them; next turn).
- Realtime push (Gmail `watch` + Pub/Sub) — we'll poll on inbox open first.

Ready? Say **go** and I'll start with the migration + secret request.