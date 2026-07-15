# Calendar and task reminders report

## What changed

- Aligned the calendar block editor labels, inputs, comment field, helper text, and actions.
- Added optional `dueTime` and `reminderMinutes` fields to tasks with legacy-state normalization.
- Added date/time and reminder controls to the compact task actions menu.
- Disabled task reminders until both a date and time are present.
- Unified calendar-block and task reminder scheduling.
- Deliver system notifications through the service worker registration when available, with a page Notification fallback.
- Added notification-click handling that focuses or opens Daily OS.
- Added persistence and migration smoke tests for task reminders.

## Why

Timed tasks and calendar commitments are the same kind of operational promise. They now share one reminder contract and permission path instead of calendar-only page notifications. Reminder settings remain metadata on the relevant task or block, so there is no extra notification dashboard.

## Files edited

- `public/app.js`
- `public/task-state.js`
- `public/task-core.css`
- `public/sw.js`
- `public/index.html`
- `scripts/task-state-smoke.test.mjs`
- `PRODUCT.md`
- `DESIGN.md`
- `docs/stages/calendar-task-system-reminders.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`
- Result: 10 task-state tests passed; reliability checks passed.

## Browser verification

URL: `http://127.0.0.1:4174/?fresh=145`

- Viewport: 1280 x 720.
- Page horizontal overflow: false.
- Calendar main panel width with editor open: 624px.
- Calendar editor width: 315px.
- Comment field: 315 x 72px.
- Comment, hint, and action overlap: false.
- Task actions menu fits inside viewport: true.
- Reminder is disabled when the selected task has no date/time: true.
- In-app browser notification capability: unsupported; UI degrades to a readable status and editing remains available.
- Responsive CSS stacks calendar time fields and actions below 420px.

## Remaining risks

- Browser/PWA permission is still required. On iOS, system notifications require an installed PWA.
- This MVP uses client-side timers. It can notify while the app or PWA process is active/backgrounded, but it cannot guarantee delivery after the browser process is fully terminated.
- Guaranteed closed-app reminders require a later Web Push backend with subscription storage and a scheduler.
