# Calendar autosave report

## What changed

- Creating a block by dragging over the calendar grid now persists it immediately.
- Moving and resizing a block now persist the updated date and time immediately.
- Dropping an unscheduled task onto the calendar immediately creates a saved block and updates the task.
- The calendar block editor now edits the saved object directly; the extra draft, cancel, and save step was removed.
- Calendar copy now explicitly says that blocks are saved automatically.
- Added a reliability contract that prevents the draft-only flow from returning unnoticed.

## Why

The previous two-step draft flow made a block visible before it was actually stored. Closing or reloading the app before pressing `Сохранить блок` could therefore make a meeting appear to disappear.

## Files edited

- `public/app.js`
- `public/index.html`
- `public/sw.js`
- `scripts/reliability-check.mjs`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`

## Browser verification

- Created a 09:00-10:15 block by dragging on the grid.
- Confirmed that it appeared immediately without a save button.
- Reloaded the app and confirmed that the block remained present.
- No horizontal layout changes were introduced by this stage.

## Remaining risks

- A block that was only a draft before this change cannot be recovered if it never reached local or cloud state.
- Cloud persistence still depends on the existing authenticated Supabase sync status.
