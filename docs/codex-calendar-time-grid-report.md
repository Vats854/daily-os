# Calendar time grid

## What changed

- Replaced the flat calendar event list with a seven-day spatial time grid.
- Added a fixed visible range from 08:00 to 23:00 with hourly guides.
- Positioned read-only calendar events by their actual start time and duration.
- Added current-day highlighting and a current-time line.
- Added previous week, next week, and return-to-today navigation.
- Added a compact lane for accepted Today/This week tasks that do not have a scheduled time.
- Clicking an unscheduled task opens it in the Tasks module instead of duplicating task controls inside Calendar.
- Kept calendar events read-only in line with the MVP integration policy.

## Product decisions

- Calendar is a schedule surface, not another task list.
- The weekly grid owns the full main canvas and does not reserve an empty inspector.
- Unscheduled tasks are secondary context above the grid, not cards competing with the schedule.
- Horizontal scrolling is contained inside the calendar on narrow screens; the whole application should not overflow.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`

## Checks run

- `node --check public/app.js`
- `node --check public/supabase-client.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Browser verification

Not completed in this turn. Starting the local dev server was blocked by the current environment usage limit. Asset version 101 must be visually checked after the runtime is available again.

Required measurements:

- page-level horizontal overflow: false;
- calendar grid owns the available main width;
- internal calendar scroll works below 900 px;
- event top and height match their start/end times;
- week navigation preserves the rest of the saved state.

## Remaining risks

- Existing calendar data only contains a small demo set for the current day.
- External calendar import is still not connected; this slice renders the read-only data model already present in state.
- Overlapping events currently share one day column and may visually overlap; collision layout belongs to the calendar integration slice.
