# Task Capture + Daily Flow Report

## What changed

- Added compact task metadata controls directly below the composer: planning horizon, date, list, and priority.
- Added a direct row action to move a task to Today or return it to Inbox without opening the inspector.
- Kept completion and restore on the task checkbox.
- Reworded sync states so cloud failures no longer imply that the immediate local save was lost.
- Added reliability checks for the quick composer and direct Today/Inbox transition.

## Why

The core daily loop should not require opening the task inspector for routine capture and planning. Local persistence is immediate, so the UI must distinguish local safety from cloud synchronization.

## Files edited

- `public/index.html`
- `public/app.js`
- `public/task-core.css`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/task-capture-daily-flow.md`

## Checks run

- `npm run check`
- `git diff --check`
- Browser task creation, Inbox to Today transition, and cleanup of the test task.
- Desktop and 390 px responsive layout measurements.

## Browser verification

- Page overflow: false on desktop and 390 px viewport.
- Desktop main panel width: 984 px with inspector closed.
- Mobile composer width: 358 px.
- Quick metadata controls visible: true.
- Created task found after submit: true.
- Task found in Today after direct transition: true.

## Remaining risks

- Quick date presets intentionally cover only no date, today, and tomorrow; custom dates remain in task detail.
- Cloud sync still depends on the user's Supabase connection, but local writes remain available when cloud sync fails.
