# Task manager architecture audit

## Audit scope

Current Daily OS task and note foundation at `v95`, reviewed as a personal task manager for daily use. Evidence was captured at the clean task list, selected task, task options, notes, and mobile reflow states.

## User goal

Capture a task quickly, understand where it belongs, clarify it without friction, execute it, and trust that its state is saved.

## Evidence

1. `docs/audits/task-manager-architecture/01-clean-list.png`
2. `docs/audits/task-manager-architecture/02-selected-task.png`
3. `docs/audits/task-manager-architecture/03-task-options.png`
4. `docs/audits/task-manager-architecture/04-notes.png`
5. `docs/audits/task-manager-architecture/05-mobile-tasks.png`

## Overall verdict

The current foundation is calmer than the previous dashboard, but it is not yet a coherent task manager. The problem is not mainly missing features. The task model exposes overlapping concepts, the list and detail panes use different interaction grammar, and the context menu behaves like a second full editor.

## Flow health

### Step 1 — Scan Today: needs structural work

Strengths:

- Tasks are readable rows rather than cards.
- Smart views and editable user lists are separated in navigation.
- Primary creation action is visible.

Risks:

- The main pane is visually underused while the task list is capped and sparse.
- Search and creation compete in the header without a strong keyboard-first capture path.
- Priority is visible as a tiny symbol, but other important state is encoded as low-contrast text.
- There is no visible sorting or grouping rule, so the list does not explain why tasks appear in this order.

### Step 2 — Open a task: partially healthy

Strengths:

- Selection is clear.
- Title and description can be edited directly.
- Detail is not shown without a selected task.

Risks:

- The fixed 360px inspector is too narrow to become a useful task workspace and too large to be a compact inspector.
- Metadata is repeated as summary chips and again inside the options menu.
- Focus controls occupy task detail even when the user is not focusing.
- There is no activity/history, recurrence, reminders, subtasks, or attachment surface.

### Step 3 — Change task options: unhealthy

Strengths:

- Date, priority, list, status, duration, tags, pin, and Focus have persisted behavior.
- Right click and ellipsis share one implementation.

Risks:

- The menu is a long form, not a context menu.
- `status`, `date`, `Today/Week`, and `list` overlap as location concepts.
- Internal English states (`Inbox`, `Backlog`) are mixed with Russian labels.
- All controls are presented at once, so frequent actions and rare actions have equal weight.
- Move and tag operations should open small nested pickers, not permanent form sections.
- The menu obscures both the list and the already-open detail pane, creating two competing editors.

### Step 4 — Work with notes: directionally healthy

Strengths:

- Notes use a separate list/editor architecture.
- The editor can use the remaining canvas instead of a narrow task inspector.

Risks:

- Empty space dominates before selection.
- Notes have no folders/tags/search-state explanation yet.
- Task and note visual grammar still feels like two separate prototypes.

### Step 5 — Mobile task flow: needs dedicated QA

- The responsive structure moves task detail to a full-screen layer and navigation to compact controls.
- The captured mobile state is difficult to inspect at the browser screenshot scale, so target sizes, text fit, keyboard behavior, and actual phone ergonomics still need device-level verification.

## Root architecture issue

The task currently has four competing placement systems:

- lifecycle `status`;
- schedule `dueDate`;
- commitment bucket `today / this_week`;
- user list `area`.

These must be separated semantically:

- lifecycle: `open`, `done`, `cancelled`;
- schedule: date, time, recurrence, reminder;
- planning: Inbox, Today, Upcoming as derived/smart views;
- organization: one user list plus zero or more tags;
- execution: estimate, priority, pinned, Focus sessions.

Today and Upcoming should normally be derived from schedule/planning data, not treated as lifecycle statuses alongside Done.

## Recommended foundation contract

### Task list

- 44–48px dense rows.
- Manual, date, priority, or created-at sort with a visible active rule.
- Optional groups: overdue, today, later, completed.
- Checkbox, priority flag, title, due date, list, and up to two tags only.
- Multi-select and bulk postpone/move only after the single-task flow is stable.

### Task detail

- A real detail pane, approximately 480–620px on desktop, using the remaining width.
- Editable title and description.
- One compact property toolbar: date, priority, list, tags, estimate.
- Click a property to open one focused picker.
- Subtasks and activity below the description.
- Focus is an action, not a permanent block.

### Context menu

- Quick date presets.
- Priority flags.
- Pin/unpin.
- Move to list submenu.
- Tags submenu.
- Start Focus.
- Complete/cancel/delete.
- Never repeat the entire detail editor inside the menu.

## Missing capabilities by priority

### P0 — Trustworthy daily task core

1. Correct task semantics and migration away from overloaded status values.
2. Undo for complete, delete, move, and reschedule.
3. Subtasks with independent completion.
4. Recurrence and reminders.
5. Stable ordering and explicit sorting.
6. Sync state with clear offline, saving, saved, and conflict states.
7. Keyboard flow: quick add, open, complete, move, date, search, close.

### P1 — Useful organization

1. Tag registry with create, rename, delete, and filter.
2. Smart filters built from list, tag, date, priority, and status.
3. Batch actions.
4. Drag reorder within a list and drag scheduling only where it has a clear meaning.
5. Calendar context and later task-to-calendar scheduling.

### P2 — Daily OS differentiation

1. Assistant suggestions based on real task history: repeatedly postponed, stale, overloaded Today.
2. Habits as a separate tracker.
3. Focus sessions and sound as a separate execution mode.
4. Project Hero Journey only after tasks, projects, and review history are reliable.

## What not to build now

- Full Freedom-style blocking inside the PWA.
- Decorative AI panels.
- More task menu commands without end-to-end behavior.
- Dashboard analytics before trustworthy task history exists.
- A complete TickTick feature clone.

## Recommended implementation sequence

1. Freeze new feature additions.
2. Produce three visual directions for one canonical Tasks screen using the agreed task contract.
3. Select one direction before editing production UI.
4. Refactor the task model and migrate existing state.
5. Implement list, detail, and context menu as one vertical flow.
6. Add undo, subtasks, recurrence, and reminders in that order.
7. Run a real five-day personal-use test before restoring AI and project layers.

## Evidence limits

- This audit did not test screen-reader output or full keyboard traversal.
- Reminder delivery, offline conflicts, and cross-device sync require runtime and device testing.
- TickTick comparison is used for interaction principles, not pixel cloning.
