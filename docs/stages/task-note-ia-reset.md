# Task and note IA reset

## Observable outcome

The user can tell where an item lives: raw input stays in `Входящие` only until it is
confirmed, executable work lives in `Задачи`, and reference material lives in
`Заметки`. Confirming an inbox proposal removes it from the active inbox without
deleting the resulting object.

## Verified current state

- `capture` renders every `inboxItems` record, including records already linked to a
  task, note, or project.
- The task module also exposes an `Inbox` planning view, which visually duplicates the
  top-level capture module.
- Notes already use their own `notes` collection and folders, but processed inbox rows
  continue to repeat those notes in capture.
- Existing persistence is a single normalized JSON state in local storage and
  `daily_os_states`; no backend migration is required for this stage.

## Scope

- Define one reusable active-inbox predicate.
- Render and count only unprocessed, unlinked inbox items.
- Remove the duplicate task `Inbox` destination from visible task navigation.
- Keep legacy tasks with `status: inbox` available in `Все задачи` and search.
- Clarify screen subtitles and empty states for Inbox, Tasks, and Notes.
- Keep processed input discoverable through the created object and audit log.

## Non-goals

- No visual redesign, framework migration, or backend table migration.
- No Kanban redesign.
- No full separation of planning horizon and workflow status in this slice; that is a
  separate data-contract stage because the current board and filters depend on
  `task.status`.

## Screen contracts

- **Входящие** primary object: an unconfirmed raw capture. No linked results.
- **Задачи** primary object: an executable action with completion state and planning
  metadata. All task views are filters over the same `tasks` collection.
- **Заметки** primary object: editable context without completion semantics. Folders
  are organization, not copies.
- The detail panel remains object-specific and opens only for a selected task or note.

## Data contract and migration

`inboxItems` remain in persisted state as audit/source records. An item is active only
when it has no `linkedId` and its status is `open` or `needs_review`. Existing processed
records need no rewrite and become hidden from the active inbox immediately.

## Acceptance criteria

1. A new raw capture appears once in `Входящие`.
2. Confirming it as a task removes it from `Входящие` and creates/selects one task.
3. Confirming it as a note removes it from `Входящие` and creates/selects one note.
4. The task sidebar has no second item named `Inbox`.
5. Legacy `status: inbox` tasks remain visible in `Все задачи`.
6. Global search does not return processed inbox source records as duplicate results.
7. Refresh preserves all resulting objects and the active inbox remains clean.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Desktop: `http://127.0.0.1:4173/?fresh=143`, 1440 x 900.
- Mobile: same route, 390 x 844.
- Record page overflow, main panel width, inspector state, and object duplication.

## Risks and rollback

The main risk is making old processed captures appear lost. Their resulting objects and
audit events remain intact; rollback is limited to the active-inbox filter and task-nav
entry.

## Handoff prompt

Review the task/note IA reset against this brief. Verify capture-to-task and
capture-to-note flows, refresh persistence, search deduplication, and desktop/mobile
layout. Do not add new modules or redesign the shell.
