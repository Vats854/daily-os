# Calendar polish and task reminders

## Observable outcome

The calendar block editor is visually aligned, and a user can assign a time and reminder to either a calendar block or a dated task. Daily OS delivers one consistent system notification while the PWA is open or running in the background.

## Verified current state

- Calendar blocks already store `reminderMinutes` and use page-level timers.
- Existing reminders call `new Notification()` directly and only cover calendar blocks.
- Tasks store a due date but no due time or reminder offset.
- The service worker only handles caching.
- The calendar editor has compact rules that are being overridden by broader detail-panel typography, producing uneven spacing on narrow layouts.

## In scope

- Align calendar editor labels, fields, hint and action spacing.
- Add `dueTime` and `reminderMinutes` to the task contract with safe defaults for old tasks.
- Add task time and reminder controls to the task detail panel.
- Replace the calendar-only scheduler with one reminder scheduler for tasks and calendar blocks.
- Deliver notifications through the service worker registration when available, with a page Notification fallback.
- Avoid duplicate delivery during one browser session.
- Explain the permission/runtime state near reminder controls.

## Non-goals

- No VAPID/Web Push server, cron job or guaranteed delivery after the browser/PWA is fully terminated.
- No email, SMS or Telegram reminders.
- No changes to Apple Calendar integration.
- No reminder inbox or notification history screen.

## Primary object and screen job

- Calendar editor: configure a scheduled block without visual ambiguity.
- Task inspector: configure the task deadline; time and reminder remain optional metadata.
- Notifications are consequences of those objects, not a new primary screen.

## Data contract and migration

Tasks gain:

- `dueTime: "HH:MM" | ""`
- `reminderMinutes: number | null`

Existing tasks normalize to empty time and no reminder. Calendar block storage remains compatible.

## Acceptance criteria

1. Old task snapshots load without errors.
2. A task with date, time and reminder retains all values after reload.
3. Calendar and task reminders share one scheduler and one permission path.
4. A reminder produces at most one notification per object occurrence in a session.
5. Calendar editor has no overlapping label, textarea, hint or actions at desktop and mobile widths.
6. Denied or unsupported notifications are described without blocking task/calendar editing.

## Verification

- Required repository checks from `AGENTS.md`.
- Task-state smoke tests for reminder persistence.
- Browser routes: `/?fresh=145`, Calendar and Tasks modules.
- Desktop: 1280 x 720; mobile responsive CSS below 720px.
- Report page overflow, editor width, field fit, and notification capability state.

## Risks and rollback

- iOS system notifications require an installed PWA and user permission.
- Browser timers cannot guarantee delivery after a full process termination; guaranteed delivery is a later Web Push backend stage.
- Rollback boundary: task reminder fields and unified scheduler can be removed without changing existing calendar block records.

## Handoff prompt

Continue Daily OS reminders from `docs/stages/calendar-task-system-reminders.md`. Preserve the task and calendar data contracts, verify real browser permission behavior, and do not claim closed-app delivery until Web Push exists.
