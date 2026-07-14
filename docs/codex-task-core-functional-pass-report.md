# Task Core Functional Pass

## What changed

- Added persistent subtasks to every task.
- Added subtask creation, completion, reopening, deletion, and progress count.
- Added task duplication from the task actions menu. The copy receives new task and subtask IDs and keeps the original task metadata.
- Added moving an editable list between the Work, Personal, and Health sections.
- Added audit events for task duplication and subtask state changes.
- Bumped application assets and the service worker cache to `v98`.

## Why

The task surface should behave as a real task tracker before more Daily OS layers are added. These changes close three important functional gaps in the current TickTick-light foundation: task decomposition, reusable tasks, and editable list architecture.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

All checks passed.

## Browser verification

Verified before the browser runtime restart:

- created a subtask;
- completed the subtask and saw progress change from `0/1` to `1/1`;
- duplicated a task and confirmed that the duplicate retained its subtask state;
- moved a list between top-level sections through the list edit menu.

The browser connection denied renewed access to `127.0.0.1:4174` after restart, so the final desktop/mobile measurement pass could not be repeated in the same session. The application remains available at `http://127.0.0.1:4174/?fresh=98` while the local server is running.

## Persistence

Every new action uses the existing `saveState()` path. It writes the full state to `localStorage`, schedules Supabase persistence through `queueCloudSave()`, and rerenders the interface. No new backend table is required.

## Remaining risks

- Cross-device Supabase persistence still requires a signed-in browser session to verify end to end.
- Final desktop and mobile overflow measurements should be repeated when browser access is available.
- The next functional slice should focus on ordering, drag-and-drop, and due-date behavior instead of adding more top-level modules.
