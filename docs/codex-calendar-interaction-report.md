# Calendar interaction core

## What changed

- Added FullCalendar 6.1.19 as the proven interaction engine behind the weekly calendar.
- Internal Daily OS time blocks can be dragged and resized with 15-minute snapping.
- External calendar events remain read-only on a per-event basis.
- Drag and resize updates the actual Daily OS block and writes an audit event.
- Tasks in the unscheduled lane can be dragged into today to create a linked time block.
- Moving blocks to another date is intentionally rejected until time blocks are normalized outside the single daily plan.
- Kept the previous custom calendar grid as a fallback if the external bundle is unavailable.
- Fixed the hidden task composer that was shifting the calendar layout.

## Files edited

- `public/index.html`
- `public/app.js`
- `public/task-core.css`
- `public/sw.js`
- `docs/deployment.md`

## Checks run

- `node --check public/app.js`
- `node --check public/supabase-client.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Browser verification

Completed for asset version 104 in the in-app browser at 1024px width:

- calendar engine: `929 × 560px`;
- rendered events: `5`;
- horizontal page overflow: `false`;
- console warnings/errors: none.

The blank canvas in v103 was caused by FullCalendar inheriting `height: 100%` through a grid without a definite parent height. The calendar now has a viewport-based working height with a 560px desktop minimum and a 520px compact-layout minimum.

`mountInteractiveCalendar()` also catches engine failures and immediately restores the built-in weekly grid instead of leaving an empty canvas.

## v105 creation and editor pass

- Drag-selecting an empty time range now creates a persisted Daily OS time block.
- Clicking an internal block opens a compact editor for title, date, start/end time, comment, and deletion.
- New blocks, edits, moves, resizes, and deletion use the existing `saveState()` path and therefore persist locally and through Supabase sync.
- External calendar events remain read-only.
- Calendar width is constrained to its main pane; horizontal overflow stays inside the calendar on compact viewports instead of moving the app navigation off-screen.

## Required interaction checks

- drag an internal block within the same day and confirm persisted start/end;
- resize from the bottom edge and confirm 15-minute snapping;
- try moving an external event and confirm it stays locked;
- drag an unscheduled task into today and confirm a time block is created;
- reload and confirm block geometry persists;
- check desktop and mobile internal scrolling without page-level overflow.

## Next slice

Add a server-side, read-only iCloud CalDAV adapter. Credentials must never be exposed to the PWA. Store an app-specific password in server-side secrets, poll calendar collections, and upsert normalized `calendar_events` rows. Keep write-back disabled during the MVP.

## v110 recurrence and reminders

- A drawn block no longer opens the editor automatically, so several blocks can be created one after another directly in the grid.
- Clicking a block still opens its editor.
- Blocks now support no recurrence, daily, weekdays, and weekly recurrence. The calendar projects occurrences into the visible week while retaining one source block.
- Blocks now support browser reminders at start or 5-60 minutes before start. Permission is requested only after the user selects a reminder.
- Reminder timers are rebuilt from persisted state for the next eight days.
- The app shell is constrained to the viewport; the calendar owns its scrolling instead of pushing the whole page.
- Unscheduled tasks use three equal desktop columns and switch back to a horizontal lane on compact screens.

Browser reminders require notification permission and an active browser or installed PWA process. Reliable background delivery on iPhone will need Web Push; that is outside this client-only slice.

## v111 multi-day ranges

- A calendar block now stores both a start date and an end date.
- Drag selection may cross day columns and creates one continuous multi-day block.
- Moving or resizing a one-off block updates its full date-time range.
- Recurring blocks preserve their multi-day duration for each projected occurrence.
- The block editor exposes start and end dates separately and prevents an end date before the start date.
