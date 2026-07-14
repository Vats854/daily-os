# Editable Task Lists

## What changed

- Converted the fixed task-list rail into editable user lists.
- Added `state.lists` with migration from the previous default categories.
- Added list actions in the simple shell:
  - create list;
  - rename list inline;
  - delete list with confirmation.
- Deleting a list moves tasks, notes, and habits to the first remaining list instead of orphaning them.
- Task and note inspectors now use `state.lists` instead of fixed `areaLabels`.
- Search, task rows, habit rows, and simple detail labels now display the current list title.
- Bumped app assets to `v86` and service worker cache to `second-brain-command-center-v86`.

## Why

The previous left rail showed fixed labels such as career/work/health/admin. That looked like a task tracker, but behaved like hardcoded demo data. The product expectation is TickTick-like: system filters stay fixed, user lists are configurable.

## Files edited

- `public/app.js`
- `public/styles.css`
- `public/index.html`
- `public/sw.js`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`

## Remaining risks

- List deletion currently uses a browser confirmation dialog. It works, but a proper inline menu/drawer would be cleaner.
- The old complex shell still contains legacy category UI in hidden/non-primary surfaces; the simple shell now has the corrected model.
