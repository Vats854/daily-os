# Stage: Task core stabilization

## Outcome

The user can create, classify, edit, complete, restore, duplicate, pin, tag, and delete a
task without losing the result after reload. Local persistence remains immediate and the
cloud status reports whether the latest snapshot is still saving, synced, or blocked.

## Verified current state

- The active task shell already exposes the core task commands and a selected-task detail.
- `saveState()` writes a normalized snapshot to localStorage before queueing Supabase.
- Cloud writes are serialized and revision guarded, but browser coverage currently checks
  isolated interactions rather than one complete task lifecycle.
- State-level smoke tests cover create/edit/reload and the daily capture-to-completion flow.
- The production shell is version `v131`; `pvz-monitor/` is unrelated and remains untouched.

## In scope

- Exercise the complete task lifecycle in the active browser shell.
- Fix functional defects found in create, selection, task properties, tags, subtasks,
  completion/restore, duplication, pinning, deletion, and reload persistence.
- Expand automated task-state coverage where a lifecycle invariant is not yet encoded.
- Verify honest local/cloud status behavior without changing the Supabase schema.

## Non-goals

- New modules, task features, visual redesign, recurring tasks, reminders, or calendar work.
- Framework migration or new build tooling.
- Replacing the existing single-state persistence model.

## Primary object and screen job

Primary object: task. The Tasks screen is a calm list of executable actions. Selecting a
task opens one inspector; compact property buttons edit the same object and do not create
duplicate panels. Closing the inspector returns the full width to the task list.

## Data contract

Task identity is stable through edits and reload. `status`, `previousStatus`, `area`,
`priority`, `estimate`, `dueDate`, `tags`, `subtasks`, and `pinned` survive serialization.
Duplicate creates fresh task and subtask IDs. Local state is written before cloud sync is
queued. No database migration is required.

## Acceptance criteria

1. A task can be created and selected from the active Tasks shell.
2. Date, priority, list, status, duration, and tags persist after reload.
3. A subtask can be added, completed, restored, and removed.
4. Completion and restoration preserve the previous task status.
5. Pinning and duplication work; the duplicate has independent IDs.
6. Delete requires confirmation and removes only the selected task.
7. Local reload preserves every confirmed operation; cloud status never claims synced while
   a write is pending or failed.
8. Desktop and mobile have no horizontal page overflow; the inspector is visible only when
   a task is selected.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser: production/fresh asset route at 1280x720 and 390x844.
- Measurements: page overflow, main width, inspector visibility and width.

## Risks and rollback boundary

The main risk is changing normalization or event delegation in a way that mutates unrelated
objects. Keep changes inside task lifecycle helpers, active-shell handlers, tests, and asset
versions. No schema or seed migration belongs in this stage.

## Handoff prompt

Work in `/Users/maffaka/Documents/New project`. Read `AGENTS.md`, `PRODUCT.md`,
`DESIGN.md`, and `docs/stages/task-core-stabilization.md`. Stabilize the existing task
lifecycle without adding features or redesigning the shell. Preserve user data and the
unrelated `pvz-monitor/` directory, run all checks, verify desktop/mobile in a real browser,
and write `docs/codex-task-core-stabilization-report.md`.
