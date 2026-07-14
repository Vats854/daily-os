# Soft Delete List Confirmation

## What changed

- Removed the native browser `window.confirm` for deleting task lists.
- Added an in-app confirmation card in the simple detail pane.
- The card shows:
  - which list will be deleted;
  - how many tasks will be moved;
  - the fallback list;
  - `Отмена` and `Удалить` actions.
- Added calm warning styling that matches the Daily OS visual system.
- Bumped app assets to `v87` and service worker cache to `second-brain-command-center-v87`.

## Why

The native browser alert looked like a system error and broke the product feel. Deleting a user list is still a risky action, but the confirmation should live inside the app and explain the consequence clearly.

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

## Next product direction

Keep simplifying the app into a TickTick-light core before adding new surfaces: task lists, notes, habits, focus, then AI routing.
