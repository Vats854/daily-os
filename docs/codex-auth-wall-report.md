# Codex Report — Auth Wall

## What Changed

- Added a compact pre-app GitHub sign-in screen.
- Hid the Daily OS workspace while auth is checking or the user is signed out.
- Kept local development usable without Supabase config.
- Reused the same GitHub sign-in handler for the gate and the topbar button.
- Bumped app assets to v68 and service worker cache to `second-brain-command-center-v68`.

## Why

The deployed URL is public, so the personal workspace should not appear before authentication. Supabase RLS protects saved cloud state, but the UI should also communicate that this is a private workspace and require sign-in before showing operational data.

## Files Edited

- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `public/sw.js`

## Checks

Run after implementation:

- `node --check public/app.js`
- `node --check public/supabase-client.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`

## Remaining Work

- Verify GitHub OAuth redirect on production.
- Verify `daily_os_states` RLS by signing in and checking persistence after reload.
- Clean or disable prototype-only buttons after auth is stable.
