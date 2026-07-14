# Task context menu report

## What changed

- Added right-click handling for task rows in the foundation task tracker.
- Right-click selects the task and opens the existing task options menu at the pointer.
- Kept the ellipsis button as the touch and keyboard-friendly alternative.
- Added close-on-outside-click behavior.
- Escape now closes the menu without closing the selected task.
- Bumped app assets and service worker cache to `v94`.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`

## Checks

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Browser verification

- URL: `http://127.0.0.1:4174/?fresh=94`
- Right-click menu visible: yes.
- Menu position: fixed at pointer, clamped to viewport.
- Horizontal overflow: false.
- Escape closes menu: yes.
- Selected task remains open after Escape: yes.
