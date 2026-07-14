# Stage: Inbox and notes reliability

## Outcome

The user can capture text, understand whether it became a task or a note, open the created
object immediately, and later find and edit the same note without guessing where it went.

## Verified current state

- Inbox records already persist raw text, parsed classification, linked type, and linked ID.
- The active shell can create tasks and notes from Inbox and can navigate to linked objects.
- Automatic AI classification currently creates an object immediately, while the UI still
  presents the record as if it needs a separate generic “Разобрать” action.
- Notes have folders and a full editor, but capture language and navigation do not explain
  the resulting folder or object consistently.
- `pvz-monitor/` is unrelated and remains untouched.

## In scope

- Make capture choices explicit: automatic recommendation plus clear task/note commands.
- Replace ambiguous “Разобрать” wording in the active shell with outcome-oriented labels.
- Show the linked object type and destination after every capture.
- Make Inbox rows, their overflow actions, and linked-object navigation consistently work.
- Verify note creation, opening, editing, folder assignment, reload, and search.
- Preserve existing data and Supabase JSON-state schema.

## Non-goals

- New AI models, chat UI, project creation redesign, rich-text editing, attachments, or a
  separate document database migration.
- Visual redesign of Tasks, Calendar, Habits, Focus, or Projects.

## Primary objects and screen jobs

Inbox primary object: raw capture awaiting or recording a classification decision.
Notes primary object: editable document with title, body, folder, tags, and update time.
The inspector appears only for a selected Inbox item or note and must edit/open that object.

## Data contract

Inbox keeps `id`, `text`, `status`, `parsed`, `linkedType`, and `linkedId`. A linked object
must resolve to an existing task, note, or project. Reclassifying an Inbox item must not
silently create duplicates. Notes retain stable IDs and folder IDs across reload and cloud
sync. No database migration is required.

## Acceptance criteria

1. Capture text once and receive a visible result with type and destination.
2. Save explicitly as a task or note without ambiguous action labels.
3. Open the linked task or note directly from Inbox and from the capture confirmation.
4. Double click and overflow actions on note rows open a working editor.
5. Edit note title, body, folder, and tags; reload preserves all fields.
6. Search finds both raw Inbox text and the resulting note/task.
7. Repeated classification does not create duplicate linked objects.
8. Desktop and mobile have no horizontal page overflow.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser at `http://127.0.0.1:4173/?fresh=<version>` on desktop and mobile.
- Measure page overflow, main width, and conditional inspector width.

## Risks and rollback boundary

The main risk is breaking event delegation shared by Tasks and Notes. Keep changes inside
capture/Inbox/Notes rendering and handlers. Do not alter task, project, or calendar schemas.

## Handoff prompt

Work in `/Users/maffaka/Documents/New project`. Read `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`,
and `docs/stages/inbox-notes-reliability.md`. Complete the Inbox-to-note/task lifecycle in
the active vanilla JS shell, preserve user data, verify desktop/mobile behavior, run all
checks, and write `docs/codex-inbox-notes-reliability-report.md`.
