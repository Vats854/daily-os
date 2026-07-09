# Auth Redirect Fix

## What changed

- GitHub OAuth now uses `APP_URL` from `/api/config` as the explicit redirect target.
- If `APP_URL` is missing, local/dev still falls back to `window.location.origin`.
- Asset versions were bumped to `v69`, and the service worker cache name was bumped to `second-brain-command-center-v69`.

## Why

Supabase was redirecting the completed OAuth session to `localhost:3000`, which means the provider accepted the login but used a local Site URL/fallback instead of the deployed app URL.

This patch makes the app-side OAuth redirect deterministic for Vercel deployments.

## Files edited

- `public/supabase-client.js`
- `public/index.html`
- `public/sw.js`

## Required Supabase setting

In Supabase Authentication URL Configuration:

- Site URL: `https://daily-os-mu.vercel.app`
- Redirect URLs:
  - `https://daily-os-mu.vercel.app`
  - `https://daily-os-mu.vercel.app/`

Without those values Supabase can still reject the app redirect and fall back to a local URL.

## Checks

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
