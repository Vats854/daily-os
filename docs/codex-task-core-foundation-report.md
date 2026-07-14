# Task Core Foundation Report

Date: 2026-07-11

## What changed

- Reduced the primary module rail to two working modules: Tasks and Notes.
- Replaced text glyphs with local Lucide icons and meaningful accessible labels.
- Added a global task/note search to the foundation shell.
- Added system task filters: Today, Next 7 days, Inbox, All tasks, Completed.
- Kept user-created lists and replaced permanent edit/delete controls with one contextual list menu.
- Made the inspector contextual and collapsible. It no longer reserves desktop width when no object is selected.
- Added working task editing for title, description, date, priority, list, status, estimate, and tags.
- Added complete/restore and guarded delete actions for tasks.
- Added working note creation, editing, list assignment, auto-save copy, and guarded deletion.
- Added a mobile full-screen detail drawer and bottom module navigation.
- Preserved the existing localStorage plus Supabase `saveState()` path.
- Kept habits, focus, projects, AI inbox, and legacy screens in stored state but removed them from the primary foundation navigation.

## Why

The previous UI mixed an unfinished task tracker with the old Daily OS shell. The first useful product boundary is now explicit: tasks, lists, notes, search, editing, completion, and persistence.

## Files edited

- `public/index.html`
- `public/app.js`
- `public/task-core.css`
- `public/sw.js`
- `public/icons/*.svg`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`

## Browser verification

Verified locally at `http://127.0.0.1:4174/?fresh=89`:

1. Created a task.
2. Changed priority, list, description, and tags.
3. Completed and restored the task.
4. Found and reopened the task through search.
5. Created a note and confirmed it remained after reload.
6. Created and deleted a user list through the contextual menu.
7. Deleted the temporary test task and note after verification.

Desktop, inspector closed:

- viewport: 1280px;
- main pane: 976px;
- inspector: hidden;
- page overflow: false.

Desktop, inspector open:

- viewport: 1280px;
- main pane: 616px;
- inspector: visible;
- page overflow: false.

Mobile:

- viewport: 390px;
- inspector drawer: 390px wide;
- page overflow: false.

Screenshots:

- `docs/audits/foundation-reset/03-task-core-desktop.png`
- `docs/audits/foundation-reset/04-task-core-mobile.png`
- `docs/audits/foundation-reset/05-task-core-empty-inspector.png`

## Remaining risks

- The legacy `.app-shell` and its handlers still exist behind the foundation shell. They are not visible, but should be physically removed or split into archived modules in a later cleanup pass.
- Cloud persistence was not exercised in this local unauthenticated browser run; the same `saveState()` path is used, but a signed-in Supabase smoke test remains necessary after deployment.
- Habits, focus, AI inbox, week planning, and projects intentionally remain outside this foundation release.
