# Task Core + Focus Companion

## What changed

- Added a TickTick-light task core: selected task state, task detail inspector, editable status/area/link/priority/estimate/date/tags, and inline Today task creation.
- Replaced the fake inspector action buttons with meaningful selected-object UI.
- Added compact grouped habits with today toggle, 7-day dots, streak, and inline habit creation.
- Added global search across tasks, projects, inbox items, and notes with `/` and `Cmd+K` focus shortcuts.
- Added Focus Companion in the task inspector: Pomodoro modes, start/pause/reset, generated productivity sound categories, volume, and focus session logging.
- Hid the demo reset button outside local mode.

## Why

The app had working sync/auth but still felt like a prototype because several visible controls either used `prompt()` or only added generic assistant log entries. This pass makes the main daily tracker objects directly editable and keeps focus/music as an optional task-level layer, not a separate dashboard.

## Files edited

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/sw.js`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Local server health check via `curl http://127.0.0.1:4174/api/health`
- Static asset check: `index.html` serves `styles.css?v=71` and `app.js?v=71`

## Browser verification

- Playwright package is present, but its Chromium binary is not installed in this environment.
- System Chrome launch through Playwright also failed in headless mode.
- Because of that, screenshot/computed layout verification could not be completed from Codex in this run.

## Remaining risks

- Focus sounds are generated Web Audio loops, not real licensed music streams.
- Pomodoro state is saved on start/pause/reset/complete, not every second, to avoid excessive Supabase writes.
- True site/app blocking remains out of scope for the PWA and should be a later browser extension or desktop helper.
