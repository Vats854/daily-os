# Today Planning Loop Report

## What changed

- The Today task list is split into `Просрочено`, `По времени`, and `Остальное на сегодня` without duplicating tasks.
- Today includes overdue unfinished tasks as well as tasks explicitly planned for today.
- Task rows now show a useful date/time label.
- The task actions menu can create a linked calendar block or open an existing one.
- A newly scheduled block is persisted immediately through the existing local and Supabase state path.
- Task date, time, and Today placement are updated together with the calendar block.

## Why

The daily loop previously stopped between the task list and calendar: a task could be selected, but it was not easy to reserve time for it. This stage makes Today a practical planning surface while keeping Calendar as the only schedule editor.

## Files edited

- `public/task-state.js`
- `public/app.js`
- `public/styles.css`
- `public/index.html`
- `public/sw.js`
- `scripts/task-state-smoke.test.mjs`
- `scripts/reliability-check.mjs`
- `docs/stages/today-planning-loop.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- 11 task-state smoke tests passed.
- All reliability contracts passed.

## Browser verification

- Desktop viewport: `1280x720`.
- Mobile viewport: `390x844`.
- Horizontal page overflow: false on desktop and mobile.
- Today renders `По времени` and `Остальное на сегодня` as separate task groups.
- A test task created exactly one linked calendar block.
- The block remained after a full page reload.
- The temporary test calendar block was removed after verification.

## Remaining risks

- Existing tasks with a scheduled block keep their due date/time if the block is later deleted. That is intentional for now, but a future calendar editor may offer an explicit `remove time from task` action.
- Today date calculation still follows the app's existing date helper behavior and was not changed in this stage.
- External calendar events remain read-only.
