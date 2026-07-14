# Calendar Draft Range Report

## What changed

- Multi-day selection now means the same time block on every selected day. A selection from Monday 13:00 to Tuesday 15:00 renders two 13:00-15:00 occurrences instead of one continuous 26-hour event.
- Calendar creation, drag, resize, and task drop now produce an in-memory draft first.
- Drafts are visually dashed and are not written to localStorage, Supabase, or the assistant log until `Сохранить блок` is pressed.
- `Отмена` and the close button revert the preview without leaving calendar objects behind.
- Existing blocks open as editable drafts when clicked.
- Selection over an existing event is disabled to prevent accidental stacking.
- Calendar labels use a 24-hour time format.
- Stale selected calendar details are cleared after reload/cloud normalization.

## Why

The previous model treated `date -> endDate` as one continuous event. It also committed every pointer gesture immediately, which created full-day-looking spans and made accidental blocks pile up. The new behavior treats a date range as repeated daily occurrences and separates preview from persistence.

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

## Browser verification

- Tested at 1280 px desktop width.
- Horizontal page overflow: false.
- Calendar time-grid body width before inspector: 927 px.
- A cross-day gesture created two preview events with dates `2026-07-13` through `2026-07-14` and time `13:00-15:15` (15-minute snapping from the pointer endpoint).
- Clicking `Отмена` returned event count to zero and closed the inspector.
- Clicking `Сохранить блок` converted both preview occurrences to non-draft events.
- 24-hour labels rendered as `13:00-15:15`.

## Remaining risks

- Incorrect blocks already saved by the older interaction are preserved deliberately; the migration does not delete user data automatically.
- A range is inclusive: Monday through Wednesday creates one equal-time occurrence on each of the three days.
- Recurring blocks still use the existing recurrence behavior; recurrence end rules can be normalized in a later calendar pass.
