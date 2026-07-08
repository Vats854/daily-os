# Codex Report — Supabase Auth And State Sync

## What Changed

- Added a public `/api/config` endpoint that exposes only browser-safe Supabase config.
- Added compact GitHub auth controls in the existing topbar: sync status, GitHub sign-in, sign-out.
- Added a vanilla ESM Supabase helper for OAuth session handling and cloud state sync.
- Connected existing `saveState()` to debounced Supabase persistence when the user is signed in.
- Added a Supabase SQL setup file for a minimal `daily_os_states` table with row level security.
- Added Vercel serverless endpoints for `/api/config` and `/api/ai/inbox`.
- Bumped app asset versions to v67 and service worker cache to `second-brain-command-center-v67`.

## Why

The current prototype is still mostly client-side demo state. For the first usable online MVP, syncing the app state as one per-user JSON document is the fastest safe bridge between local prototype and a real multi-device product. It avoids pretending the full normalized schema is production-ready while still giving phone/laptop continuity.

## Files Edited

- `.env.example`
- `server.js`
- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `public/supabase-client.js`
- `public/sw.js`
- `db/supabase-state-sync.sql`
- `api/config.js`
- `api/ai/inbox.js`

## Setup Needed

1. In Supabase SQL Editor, run `db/supabase-state-sync.sql`.
2. In Supabase Auth providers, enable GitHub.
3. In GitHub OAuth app, set callback URL to the Supabase callback URL:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. In local `.env` and Vercel environment variables, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `APP_URL`
5. On Vercel, set the app URL in Supabase Auth redirect URLs.

## Checks Run

- `node --check public/app.js`
- `node --check public/supabase-client.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`

All passed.

## Browser Verification

Not completed in Codex: local dev server startup required sandbox escalation, but the escalation was blocked by the current Codex usage limit. Manual verification needed:

- Start `npm run dev`.
- Open `http://127.0.0.1:4174/?fresh=67`.
- Confirm the topbar shows `local` when Supabase env is missing.
- Add Supabase env, restart server, confirm GitHub sign-in appears.
- Sign in, change a task/habit/focus, reload on another device, confirm state appears.

## Remaining Risks

- State sync is document-level, not normalized table persistence yet.
- Conflict resolution is simple: on sign-in, remote state wins if it exists.
- Supabase JS is loaded from CDN for now; production can later vendor or bundle it.
- The deployed app shell is public unless an auth wall is added. Supabase RLS protects saved state per authenticated user, but the unauthenticated demo UI can still be opened by anyone with the URL.
