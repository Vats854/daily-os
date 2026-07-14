# Task engine slice report

## What changed

- Added persisted `pinned` state to tasks.
- Pinned tasks sort above other tasks and show a compact marker.
- Priority now has a visible flag in task rows and colored flag controls in the menu.
- Moving a task between user lists updates the task and survives reload.
- Tags can be created through input, selected from existing tags, shown in rows, and persisted while typing.
- `Начать фокус` now selects the task, starts the real timer, and writes an audit action.
- The selected task shows a compact Focus strip with start, pause, and reset controls.
- Fixed Focus start-time ordering so completed sessions can calculate duration correctly.
- App assets and service worker cache were bumped to `v95`.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `docs/data-model.md`

## Checks

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Browser verification

- URL: `http://127.0.0.1:4174/?fresh=95`
- Pin persisted after reload: yes.
- List move persisted after reload: yes.
- Priority update persisted after reload: yes.
- Tags persisted after reload and appeared in the task row: yes.
- Focus timer started and counted from `25:00` to `24:59`: yes.
- Pause/reset controls visible and working: yes.
- Horizontal overflow: false.
- Desktop main width during selected-task test: 616px.
- Desktop detail width during selected-task test: 360px.

## Deferred

- Subtasks are intentionally deferred to the next vertical slice because they require nested task data, completion rules, and dedicated editing UI.
- Recurrence, reminders, duplicate, copy-link, and convert-to-note are not shown as fake commands.
