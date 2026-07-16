# Cloud sync fallback report

## What changed

- Added an optimistic revision-based save fallback when the Supabase RPC function is unavailable.
- Kept conflict detection: a stale browser cannot silently overwrite a newer cloud revision.
- Bumped application and service-worker assets to v151.

## Why

Production could read an existing `daily_os_states` row but displayed `не сохранено` when the newer `save_daily_os_state` RPC had not yet been installed. The table and RLS policies were usable, so the missing RPC should not block ordinary saves.

## Files edited

- `public/supabase-client.js`
- `public/index.html`
- `public/sw.js`

## Remaining risk

Localhost and Vercel keep separate browser storage. A local-only calendar is intentionally not merged into the cloud automatically; import/export remains the safe transfer path.

## Checks run

- JavaScript syntax checks for app, Supabase client, service worker, and server.
- Full `npm run check` reliability and task-state suite.
