# Toast Delete Confirmation

## What changed

- Moved list deletion confirmation out of the right detail pane.
- Added `#simpleToastLayer` inside the simple app shell.
- The delete confirmation now appears as a small in-app toast/dialog overlay.
- The selected task/note/detail pane stays visible while the confirmation is shown.
- Bumped app assets to `v88` and service worker cache to `second-brain-command-center-v88`.

## Why

Replacing the right pane made the UI feel unstable and creepy: the selected object disappeared just because the user clicked delete on a list. A temporary overlay is softer and keeps the workspace context intact.

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
