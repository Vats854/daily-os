# Stage: Manual task ordering

## Observable outcome

On desktop, the user can drag a task row to a new position in the current task list. The order survives reload and cloud synchronization without changing the task's date, list, planning bucket, or workflow status.

## Verified current state

- Task rows are sorted by `pinned` and then `updatedAt`, so editing a task silently changes its visual position.
- Kanban cards already use drag and drop for workflow transitions; the main task list has no ordering interaction.
- State persists as one JSON document through `saveState()` to localStorage and Supabase.

## Scope

- Add a persisted numeric `position` to task records, including migration for existing state.
- Sort task lists by pinned group, then manual position, then stable fallback.
- Add desktop drag and drop to task rows in list views.
- Keep pinned and unpinned tasks in separate ordering groups.
- Log a successful order change and save it through the existing persistence path.

## Non-goals

- No kanban behavior changes.
- No cross-list, date, status, or workflow changes during row dragging.
- No touch drag interaction in this stage.
- No framework or backend schema migration.

## Product contract

The primary object is a task. The current list remains the screen job. Dragging only changes presentation order; task meaning and planning metadata remain unchanged. The inspector remains bound to the selected task.

## Data and migration

- `task.position`: finite non-negative number.
- Existing tasks without a position receive a stable position from their persisted array index.
- New and duplicated tasks receive the next available position.
- Reordering rewrites positions only for the visible pinned or unpinned group.

## Acceptance criteria

1. A desktop task row exposes a drag handle and can move before or after another row in the same pinned group.
2. Dropping across the pinned boundary is rejected without changing task data.
3. Reload preserves the new order.
4. Date, list, planning bucket, workflow status, priority, and completion state remain unchanged.
5. Board drag and drop continues to change workflow stage as before.
6. No horizontal page overflow at desktop and mobile widths.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser: `http://127.0.0.1:4174/?fresh=154`
- Desktop: 1440x900. Mobile: 390x844.

## Risks and rollback boundary

Native HTML drag behavior varies on touch devices, so it is deliberately disabled there. The change is isolated to task position normalization, list sorting, row markup, event handlers, and row styling.

## Handoff prompt

Verify manual task ordering in Today, All tasks, and a custom list. Confirm that pinned grouping and kanban workflow drag remain independent, then inspect persistence after reload and authenticated cloud sync.
