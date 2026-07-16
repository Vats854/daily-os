# Stage: AI decomposition for a task

## Observable outcome

From the selected task menu, the user can choose `Разбить на шаги`, review and edit a compact AI draft, and explicitly add the approved steps as subtasks.

## Verified current state

- Tasks already support persisted subtasks with create, complete, restore, and delete actions.
- The task detail has one contextual command menu and a compact subtask list.
- Gemini is available through local and Vercel API routes.
- Task changes persist through the existing `saveState()` local and Supabase flow.

## In scope

- Add one task-menu command: `Разбить на шаги`.
- Send a bounded task context to `POST /api/ai/task-decompose`.
- Return 3–7 concrete steps with optional duration estimates, or an atomic-task explanation.
- Show an editable temporary draft inside the task detail surface.
- Add only explicitly confirmed, non-duplicate steps to `task.subtasks`.
- Add an audit event and deterministic local fallback.

## Non-goals

- No automatic decomposition on task creation.
- No project creation, due-date changes, or task reprioritization.
- No persistent chat or decomposition history.
- No replacement of existing subtasks.

## Primary object and screen job

Primary object: selected task. The task detail remains the only work surface. The decomposition draft is temporary and replaces neither the task menu nor the subtask list.

## Data contract

The API receives task title, description, estimate, due date, list, project title, and up to 12 existing subtask titles. It returns `needed`, `reason`, and up to seven `{ title, estimateMinutes }` steps. The draft lives in `state.ui.taskDecompositionDraft` and only accepted titles are persisted as regular subtasks.

## Acceptance criteria

1. The command is visible in the standard task menu.
2. AI receives no whole-state dump.
3. The draft supports editing, removing, and adding a row before confirmation.
4. Cancel changes no task data.
5. Confirm adds each approved step once and writes one audit event.
6. Atomic tasks are not padded with meaningless steps.
7. Provider failure produces a usable local draft.
8. Desktop and mobile have no horizontal page overflow.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `node --check api/ai/task-decompose.js`
- `npm run check`
- Browser at `http://127.0.0.1:4174/?fresh=150`, desktop `1280x720` and mobile `390x844`.

## Risks and rollback

AI may return generic steps. The user can edit or reject the draft, duplicates are filtered, and no other task metadata changes. Rollback is limited to the endpoint, menu command, temporary draft, and its styles.

## Handoff prompt

Implement task decomposition as a confirmation-first task-menu command. Reuse regular subtasks, keep AI context bounded, provide an atomic-task response and local fallback, then verify persistence and responsive layout.
