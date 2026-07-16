# Manual task ordering report

## What changed

- Added a persisted numeric `position` to task records with a stable migration for existing data.
- Replaced implicit `updatedAt` list sorting with pinned-group plus manual-position sorting.
- Added a small desktop drag handle to task rows and before/after insertion feedback.
- Limited reordering to the current visible list or Today section and the same pinned group.
- Kept mobile rows unchanged and preserved the separate kanban workflow drag behavior.
- Added a state-contract test proving that reordering does not change planning or workflow fields.

## Why

Editing a task previously moved it to the top, making the list unpredictable. Manual order gives the user explicit control without turning a reorder gesture into a hidden planning action.

## Files edited

- `public/app.js`
- `public/task-state.js`
- `public/task-core.css`
- `public/icons/grip-vertical.svg`
- `public/index.html`
- `public/sw.js`
- `scripts/task-state-smoke.test.mjs`
- `docs/stages/task-manual-ordering.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check` (12 task-state tests passed)

## Browser verification

- Route: `http://127.0.0.1:4174/?fresh=154`
- Desktop viewport: 1280 x 720.
- Page horizontal overflow: false (`scrollWidth` 1280, viewport 1280).
- Main task panel width: 451px with the task inspector visible.
- Six Today rows rendered with ordering hooks; timed and remaining sections stayed distinct.

## Remaining risks

- Touch ordering is intentionally deferred; mobile keeps selection and task controls without drag.
- Authenticated cloud persistence still needs a manual user-session check after deployment, although order uses the same tested `saveState()` queue as other task edits.
- Native drag behavior should receive one production smoke test in the user's desktop browser.

## Next smallest valuable stage

Add keyboard-accessible `Move up` / `Move down` commands to the compact task menu, then perform a short real-routine MVP observation pass before adding more task features.
