# Sync Error Copy

## What changed

- Replaced the generic `sync error` status with a clearer `setup needed` state when the user is signed in but Supabase persistence is not ready.
- Added readable guidance for missing `daily_os_states` table/schema cache errors.
- Added readable guidance for RLS/permission errors.
- Bumped asset versions to `v70` and service worker cache to `second-brain-command-center-v70`.

## Why

After GitHub login, the app immediately tries to load or create the per-user cloud state in `daily_os_states`. If the Supabase SQL setup has not been run, the app works locally but cannot sync, and the previous UI only showed `sync error`.

## Files edited

- `public/app.js`
- `public/index.html`
- `public/sw.js`

## Checks

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
