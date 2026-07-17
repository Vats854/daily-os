# Stage: Task capture and daily flow

## Outcome

The user can create a correctly classified task without opening the inspector, move it
between Inbox and Today in one click, complete or restore it, and understand whether the
change is saved locally or in the cloud.

## Current state

- Tasks already have independent `planBucket` and `workflowStatus` fields.
- The global task composer creates working tasks but always applies implicit defaults.
- Completion is functional; planning transitions require opening the task menu.
- `saveState()` writes localStorage immediately and queues versioned Supabase sync.
- A cloud error is currently labelled `not saved`, even though the local write succeeded.

## Scope

- Add compact date, list, and priority controls to the task composer.
- Add one-click Inbox/Today planning actions to task rows.
- Keep completion/restoration on the existing checkbox.
- Make sync copy distinguish local persistence from cloud persistence.
- Preserve manual ordering, task semantics, undo, logs, and Supabase queueing.

## Non-goals

- No new task schema or backend table.
- No new calendar or AI behavior.
- No mobile drag-and-drop.
- No automatic reinterpretation of user-entered task text.

## Primary object and screen job

- Primary object: task.
- Screen job: capture and move executable work through the daily loop.
- Inspector: remains the full editor; quick controls only cover frequent metadata.

## Data contract

The composer writes existing fields only: `planBucket`, `dueDate`, `area`, and `priority`.
Row transitions use `setTaskPlanBucket`; completion continues to use the tested workflow
helpers. Existing snapshots require no migration.

## Acceptance criteria

1. A task can be created with Today/no date, list, and priority from the composer.
2. A task can move Inbox -> Today and Today -> Inbox without opening the inspector.
3. Completion and restoration still preserve the prior planning bucket.
4. Every action writes an audit event and passes through `saveState()`.
5. Local persistence is never described as lost when only cloud sync failed.
6. Desktop and mobile layouts have no page-level horizontal overflow.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser: `/tasks/today`, `/tasks/inbox`, 1280x720 and mobile viewport.

## Risks and rollback

The main risk is composer state being reset during rendering. Keep the draft controls in
DOM-backed state and reset them only after successful creation. Rollback is limited to
the composer markup, row quick action, copy, and related CSS.

## Handoff prompt

Implement and verify the Daily OS task capture/daily-flow stage from this brief. Preserve
existing task semantics and persistence; do not expand into calendar, AI, or new schema.
