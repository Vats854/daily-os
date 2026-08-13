# Calendar system notifications v217 — report

## What changed

- Calendar blocks now have independent start and end reminder settings.
- Permission is requested only from explicit **Включить системные** or **Проверить**
  actions in the block inspector.
- Test notifications explain whether full push or foreground-only delivery is active.
- Push subscriptions are persisted per authenticated user with RLS.
- The service worker receives push payloads and opens Calendar/the selected block.
- A Supabase Edge Function reference scans due reminders once per minute, sends Web Push,
  removes expired subscriptions, respects the user's IANA timezone, and deduplicates
  deliveries in Postgres.
- Existing `reminderMinutes` values remain start reminders; new end reminders default to
  disabled, so migration is lossless and non-surprising.

## Files

- `public/app.js`, `public/sw.js`, `public/supabase-client.js`, `public/task-core.css`
- `api/config.js`, `server.js`, `public/index.html`
- `db/push-notifications.sql`
- `supabase/functions/calendar-push/index.ts`
- `scripts/reliability-check.mjs`
- `docs/stages/calendar-system-notifications-v217.md`
- `docs/calendar-push-setup.md`

## Verification

- Required Node syntax checks passed.
- `npm run check` passed, including 13 state smoke tests and new notification contracts.
- Browser at 1180x820: Calendar block inspector displayed both reminder fields and both
  explicit actions; selecting **За 5 минут** for completion persisted; page overflow was
  false and the contextual inspector remained visible.
- Notification permission was denied in the isolated test browser, so the OS permission
  prompt and actual push delivery must be verified on the user's installed PWA after
  external setup.

## Remaining external work and risks

- Production setup completed on 14 August 2026: SQL/RLS applied to Supabase OSSS,
  VAPID secrets configured, `calendar-push` deployed with a separate cron secret,
  one-minute Supabase Cron enabled, and v217 deployed to `daily-os-mu.vercel.app`.
- Production checks: `/api/config` reports Supabase and VAPID configured; the site
  responds 200; direct unauthenticated Edge Function invocation responds 401.
- Actual OS permission/subscription delivery still requires the user to sign in and
  click **Включить системные** in their everyday browser. The isolated verification
  browser was not signed into Daily OS and connected Chrome control was unavailable.
- Cron delivery is minute-granular. Device push services can add delivery latency.
- iPhone/iPad support requires an installed Home Screen PWA on iOS/iPadOS 16.4+.
- External read-only calendar events are not copied into Daily OS notification storage;
  only accepted Daily OS blocks are notified.

## Next smallest valuable stage

Perform a controlled device acceptance test: one start notification and one completion
notification on the installed PWA, then add delivery diagnostics only if that test finds
a reproducible failure.
