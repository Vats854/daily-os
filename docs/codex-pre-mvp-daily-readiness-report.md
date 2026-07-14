# Pre-MVP Daily Readiness Report

## What changed

- Removed the blocking authentication gate from checking and signed-out states.
- Kept GitHub authentication as an optional sync action instead of an entry requirement.
- Prevented duplicate cloud hydration for the same authenticated user.
- New local installations now start with a clean workspace instead of demo tasks, projects, habits, notes, and calendar data.
- Added a one-level 12-second undo for task completion changes and task/note deletion.
- Added a non-blocking offline status; local work continues and queues cloud synchronization.
- Fixed the mobile shell grid so the list rail and main workspace use the full viewport width.
- Bumped application assets and service worker cache to v129.

## Why

The MVP must remain usable when authentication is unavailable, delayed, cancelled, or unnecessary. A first-run user should see a trustworthy empty workspace, while destructive daily actions need a quick recovery path.

## Files edited

- `public/app.js`
- `public/index.html`
- `public/styles.css`
- `public/task-core.css`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/pre-mvp-daily-readiness.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

All reliability contracts and five state/backup smoke tests pass.

## Browser verification

Desktop at 1280 x 720:

- authentication state: local;
- auth gate display: none;
- application display: grid;
- horizontal overflow: false;
- main workspace width: 984 px;
- empty inspector reserved: false.

Mobile at 390 x 844:

- auth gate display: none;
- application/list/main widths: 390 px;
- horizontal overflow: false;
- console errors: none.

## Remaining risks

- Undo restores one full state snapshot. Edits made after the reversible action and before pressing Undo would also be rolled back.
- Browser notification reminders and background scheduling are outside this slice.
- Cloud persistence still depends on the deployed Supabase schema and RLS configuration being current.
