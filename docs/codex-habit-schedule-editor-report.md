# Habit schedule editor report

## What changed

- Added per-habit weekday schedules with daily as the backward-compatible default.
- Added a selected-habit editor for title, list, time-of-day group and weekdays.
- Removed the always-visible group select from tracker rows; configuration now lives in
  the inspector while the list stays scan-friendly.
- Added archive and restore without deleting completion history or streak data.
- Filtered the active tracker to habits scheduled for the current weekday.
- Kept the seven-day completion dots and today's completion summary.
- Bumped app assets and service-worker cache to `v136`.

## Why

The Habits module could record a daily check but could not express a real routine schedule
or remove an inactive habit. The new contract makes the module usable in daily life without
mixing habits back into Tasks or Today.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/habit-schedule-editor.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check` — all reliability contracts and 7/7 state tests passed
- `git diff --check`

## Browser verification

Tested at `http://127.0.0.1:4174/?fresh=136`.

- Opened an existing habit and verified the editor shows title, list, group and weekdays.
- Removed Wednesday: the habit disappeared from today's tracker and stayed excluded after
  a full reload.
- Re-enabled Wednesday, archived the habit, then restored it from the archive section.
- Existing completion/streak information remained intact.
- Desktop 1280 px: page overflow `false`; main pane `520px`; inspector `464px` when open.
- Mobile 390 x 844: page overflow `false`; app, main pane and detail each fit `390px`.

## Remaining risks

- Schedules support weekdays only. Custom intervals, reminders and pause-until-date remain
  outside this MVP slice.
- Streak is still the existing stored counter; a future analytics pass should derive streaks
  from completion history and schedule rules.

## Next smallest valuable stage

Isolate the hidden legacy dashboard render path from the active task-core bundle, then run
one production cross-device smoke test while signed in.
