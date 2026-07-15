# Task planning and workflow Kanban report

## What changed

- Split task state into two independent axes:
  - `planBucket`: Inbox, Backlog, This week, Today;
  - `workflowStatus`: Not started, In progress, Done.
- Added migration for existing tasks that only have the legacy `status` field.
- Replaced the old five-column status board with a three-column Kanban over the same task records.
- Added accessible arrow controls and pointer drag-and-drop between workflow columns.
- Added separate planning and workflow controls to the task inspector.
- Added an All tasks view and kept planning context visible on Kanban cards.
- Updated task mutations, Inbox actions, calendar scheduling, project load checks and autopilot logic to use the new state model.
- Updated product and interface architecture documentation.

## Why

The previous `status` mixed two different questions: when the task is planned and whether work has started. That caused duplicate screens and made a real Kanban impossible. The new model keeps one task record and exposes different views over it.

## Files edited

- `PRODUCT.md`
- `DESIGN.md`
- `docs/interface-architecture-reset.md`
- `docs/stages/task-planning-workflow-kanban.md`
- `public/app.js`
- `public/task-state.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `scripts/task-state-smoke.test.mjs`

## Checks run

- `node --check public/app.js`
- `node --check public/task-state.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

All checks passed. Task-state smoke coverage now includes independent planning/workflow changes and legacy completed-task migration.

## Browser verification

Verified at `http://127.0.0.1:4174/?fresh=144` in a 1280 x 720 viewport.

- page horizontal overflow: false;
- Kanban columns: 3;
- initial workflow distribution in the test state: 8 / 0 / 1;
- after moving one task: 7 / 1 / 1;
- moved task retained `Today` planning context;
- workflow change remained after reload;
- selected task inspector: visible;
- inspector without a selected task: hidden by navigation reset;
- Kanban cards fit the board; titles truncate instead of resizing columns.

The responsive CSS switches the board to an internally scrollable three-column strip below 720px, avoiding page-level horizontal overflow while preserving usable column width.

## Remaining risks

- Drag-and-drop is pointer-based and should receive a final touch-device pass on the deployed PWA.
- The legacy `status` mirror remains temporarily for compatibility with older saved snapshots. New UI logic must use `planBucket` and `workflowStatus`.
- Multi-user conflict handling is unchanged; this stage only changes the task state stored inside the existing JSON document.
