# Calendar push setup

The app-side implementation is ready, but closed-app delivery needs the following
external setup. These steps are intentionally not applied or deployed automatically.

1. Generate one VAPID key pair. Configure `VAPID_PUBLIC_KEY` in Vercel and configure
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `APP_URL` as Supabase
   Edge Function secrets.
2. Run `db/push-notifications.sql` in the Supabase SQL editor.
3. Deploy `supabase/functions/calendar-push` with JWT verification enabled.
4. In Supabase Cron, invoke the Edge Function every minute. Use Vault for the project URL
   and service-role credential; never put either secret in repository SQL.
5. Deploy the web app only after explicit approval, install Daily OS as a PWA, open a
   calendar block, tap **Включить системные**, and allow notifications.
6. Use **Проверить** before relying on scheduled delivery.

On iPhone/iPad, Web Push requires iOS/iPadOS 16.4+ and Daily OS must be added to the Home
Screen. Notification permission must be requested from the installed app via the button.

The foreground timer remains a fallback. It is useful while the app is active, but is
not a substitute for the scheduled Edge Function when the app is closed.
