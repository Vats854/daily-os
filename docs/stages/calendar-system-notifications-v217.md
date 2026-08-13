# Calendar system notifications v217

## Outcome

An accepted calendar block can notify the user before it starts and when it ends. The
same settings support foreground system notifications immediately and standards-based
Web Push when the installed PWA is closed.

## Current state

Calendar blocks already store `reminderMinutes`, request Notification permission, and
schedule an eight-day `setTimeout` horizon. The service worker can display and open a
notification, but there is no Push subscription, push event handler, end reminder, or
background scheduler.

## Scope

- Preserve `reminderMinutes` as the start reminder.
- Add optional `endReminderMinutes` (minutes before block end).
- Add explicit enable/test actions inside the block inspector.
- Add Push subscription persistence with RLS.
- Add a service-worker push handler and a Supabase scheduled Edge Function reference
  implementation for closed-app delivery.
- Keep foreground scheduling as a fallback.

## Non-goals

No external calendar import, notification dashboard, deployment, or automatic changes
to existing reminder choices.

## Acceptance

- Existing blocks load unchanged.
- Start and end settings save independently.
- Permission is requested only from a direct button action.
- Test notification reaches the service worker when permission is granted.
- Foreground start/end timers are deduplicated.
- Push subscription is stored only for the signed-in user.
- Push click opens Calendar with the selected block id in the URL.
- Required repo checks and browser verification pass.

## Risk and rollback

iPhone/iPad require an installed Home Screen PWA. True closed-app delivery additionally
requires applying the SQL, deploying the Edge Function, VAPID secrets, and a one-minute
Supabase Cron. Rollback is limited to v217 UI/data fields, push helper/schema/function,
service-worker handlers, and asset versions.

## Handoff

Apply `db/push-notifications.sql`, configure VAPID secrets, deploy the Supabase
`calendar-push` function, schedule it every minute, then verify one start and one end
notification on an installed PWA. Do not deploy without explicit approval.
