# Task, Note, and Inbox IA Reset

## What changed

- Reduced Inbox to unresolved source records only. Once an item is confirmed as a task, note, or project, it disappears from the visible Inbox.
- Removed the duplicate task-level Inbox from the Tasks navigation.
- Kept one task core: Today, Next 7 Days, All Tasks, Completed, and user lists.
- Clarified Notes copy so notes are presented as context without a completion status.
- Limited global Inbox search results to unresolved records, preventing processed source records from appearing beside their resulting objects.
- Added a compatibility migration that moves an old task-Inbox view to All Tasks.

## Why

The previous interface exposed three overlapping surfaces: raw Inbox records, tasks with `inbox` status, and notes created from those records. That made one thought appear to live in several places. The new contract is:

- Inbox is temporary input awaiting a decision.
- Task is an executable action with completion state.
- Note is durable context without completion state.
- The processed Inbox source remains in state for audit/history but is no longer a second user-facing object.

## Files edited

- `public/app.js`
- `public/styles.css`
- `public/index.html`
- `public/sw.js`
- `docs/stages/task-note-ia-reset.md`
- `docs/codex-task-note-ia-reset-report.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`

All checks passed.

## Browser verification

Verified at `http://127.0.0.1:4174/?fresh=143`.

Desktop, 1280 x 720:

- page overflow: false;
- main panel width: 984px;
- Inbox starts with only unresolved records;
- confirming `Сохранить заметкой` changes the Inbox count from 1 to 0;
- the resulting note appears once in Notes;
- task navigation contains Today, Next 7 Days, All Tasks, Completed, and user lists, with no duplicate Inbox;
- inspector is hidden until an object is selected and visible for a selected task/note.

Mobile, 390 x 844:

- page overflow: false;
- main panel width: 390px;
- task list fits the viewport;
- task detail is not reserved as an empty desktop rail;
- primary module and task navigation remain reachable.

## Remaining risks and next stage

- Legacy tasks may still have `status: inbox`; they remain visible in All Tasks so no data is lost.
- Task planning horizon and workflow state still share the same `status` field. The next architecture stage should introduce separate `planBucket` and `workflowStatus` fields, then make Kanban a view over the same tasks rather than another storage location.
- Historical processed Inbox records are retained intentionally for audit and can be compacted later if storage growth becomes material.
