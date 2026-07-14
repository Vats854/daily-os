# Task core stabilization report

## What changed

- Added explicit task restore and duplication helpers in `public/task-state.js`.
- Restoring a completed task now returns it to its previous status and updates its timestamp.
- Duplicating a task now creates independent task and subtask IDs, resets pinning, and restores a completed source task into an active status.
- Closed stale quick-tag state when opening another task menu or closing task detail.
- Expanded state smoke tests to cover restore and independent duplication contracts.
- Bumped application assets and the service-worker cache to `v132`.

## Why

The active task shell already supported the main commands, but the full lifecycle had not
been exercised as one contract. Browser testing found that duplicating a pinned task also
pinned its copy. Moving restore and duplicate behavior into tested state helpers prevents
the UI handlers from silently drifting apart.

## Files edited

- `public/app.js`
- `public/task-state.js`
- `public/index.html`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `scripts/task-state-smoke.test.mjs`
- `docs/stages/task-core-stabilization.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

All checks passed. Task-state smoke coverage is now 7/7.

## Browser verification

Verified on the active local app at `http://127.0.0.1:4174/?fresh=132`:

- create and select a task;
- edit priority, duration, and tags;
- add and complete a subtask;
- complete the task, reload, and restore it to Today;
- duplicate a pinned task and confirm the copy is not pinned;
- delete all temporary smoke-test objects.

After reload, title, priority, duration, tags, subtask state, completion, and restoration
were preserved. Desktop measurements at 1280 px: page overflow `false`, main panel width
`984px`, empty inspector width `0px`.

## Remaining risks

- The browser backend used for this pass did not expose viewport emulation, so the mobile
  acceptance criterion remains covered by existing responsive CSS rather than a fresh
  390 px interaction run. No layout rules changed in this stage.
- Signed-in Supabase persistence should receive one production cross-device smoke test;
  local persistence and the serialized cloud-write contracts passed automated checks.
