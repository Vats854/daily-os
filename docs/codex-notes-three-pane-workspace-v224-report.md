# Notes three-pane workspace v224 — report

## What changed

- Replaced the four-column Notes desktop shell with three persistent zones: global icon rail, note library, and editor.
- Moved folder filters into the library as a compact horizontal toolbar.
- Kept folder creation, rename, icon/tone selection, and deletion available from the selected folder action.
- Gave the editor all width left after the 360–420px library.
- Stabilized Notes theme tokens below the desktop breakpoint so dark and light surfaces no longer mix.
- Bumped application assets and service-worker cache to v224.

## Why

The separate folder sidebar consumed useful width and left the note list and editor cramped. The revised structure follows the screen job: choose a note in a compact library and edit it in a wide document pane.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `docs/stages/notes-three-pane-workspace-v224.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Browser verification

- Route: `http://127.0.0.1:4173/?fresh=224`
- 1180px viewport: library 360px, editor 764px, page overflow false, note row fit true.
- 1512px viewport: library 420px, editor 1036px, page overflow false.
- 780px viewport: main 780px, editor hidden until selection, page overflow false.
- Folder selection and selected-folder menu are visible and usable.
- Dark theme at 780px: header and main both `rgb(20, 25, 34)` with light title text.
- Light and dark modes were switched through the app appearance controls; the original dark preference was restored after verification.

## Remaining risks

- Very large user-created folder sets use horizontal scrolling in the compact folder toolbar by design.
- Production deployment should be promoted only after the branch preview reports Ready.
