# Stage: task planning horizon and workflow Kanban

## Observable outcome

The user can decide **when** a task belongs (`Inbox`, `Backlog`, `This week`, `Today`) independently from **how far the work has progressed** (`To do`, `In progress`, `Done`). The Tasks module offers list views for planning and one Kanban view for workflow, all backed by the same task record.

## Verified current state

- `tasks[].status` currently mixes planning horizon and completion state.
- `Today`, `Next 7 days`, `All tasks`, and `Completed` filter this overloaded field.
- The current `board` route renders an all-tasks list, not a Kanban.
- Task state is persisted as one JSON document locally and in `daily_os_states`.

## Scope

- Add canonical `planBucket` and `workflowStatus` fields with migration from legacy `status`.
- Keep `status` and `previousStatus` as compatibility mirrors for older code and saved snapshots.
- Add `All tasks` as its own list route and make `Board` a three-column workflow Kanban.
- Make Today/Next 7/List views depend on planning horizon; make Completed/Kanban depend on workflow.
- Expose both controls in task detail.
- Support Kanban drag-and-drop plus explicit move buttons.
- Update task-state smoke tests and source-of-truth documentation.

## Non-goals

- No new backend tables or framework migration.
- No redesign of Notes, Calendar, Habits, Focus, Projects, or global styling.
- No subtasks on the Kanban and no custom workflow columns in this stage.

## Primary object and screen job

- Primary object: one task record.
- Planning list job: answer when the task is intended to happen.
- Kanban job: answer whether work has started or finished.
- Inspector: edit both dimensions without duplicating the task.

## Data contract and migration

- `planBucket`: `inbox | backlog | this_week | today`.
- `workflowStatus`: `todo | in_progress | done`.
- Legacy `status=done` migrates to `workflowStatus=done` and restores `planBucket` from `previousStatus` (fallback `today`).
- Other legacy statuses migrate directly to `planBucket` with `workflowStatus=todo`.
- Compatibility mirror: `status=done` when workflow is done, otherwise `status=planBucket`.

## Acceptance criteria

1. Changing a planning bucket does not change workflow status.
2. Moving a card on Kanban does not change its planning bucket.
3. A task appears once in state and once in its current Kanban column.
4. Completing and restoring a task preserves its planning bucket.
5. Legacy snapshots load without losing tasks.
6. Both fields survive local serialization and reload.
7. Desktop has no page-level horizontal overflow; mobile keeps board overflow inside the board surface.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser: `/` at desktop and mobile widths; task list, inspector, Kanban move, reload.
- Report page overflow, main width, inspector state, and Kanban fit.

## Risks and rollback boundary

The primary risk is legacy code continuing to mutate `status` directly. The compatibility mirror limits data loss; this stage updates all task-core mutations and filters. Rollback is limited to the task-state helper, task views, and related documentation.

## Handoff prompt

Verify the task planning/workflow split in Daily OS. Confirm migration of legacy tasks, independent controls in the inspector, Kanban drag-and-drop, persistence after reload, and no duplicate task records. Fix only regressions inside this task-core slice.
