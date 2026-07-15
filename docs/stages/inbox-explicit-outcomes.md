# Stage: explicit Inbox outcomes

## Observable outcome

Every unresolved Inbox record presents three visible outcomes: create a task for today,
create a backlog task, or save a note. Until the user chooses one, the record stays in
Inbox and no task or note is created.

## Verified current state

- Capture already creates one unresolved `inboxItems` record without creating an object.
- The current row foregrounds an assistant proposal and hides the actual outcomes under
  `Другой вариант`.
- Task and note creation already use `sourceInboxId` and linked-object checks to avoid
  duplicate results.
- Resolved records are retained for audit but filtered out of the active Inbox.

## In scope

- Replace assistant-proposal UI with three explicit, always-visible outcomes.
- Show the destination list or note folder before the user commits.
- Explain that an untouched record remains in Inbox.
- Preserve idempotent task/note conversion and the current state schema.
- Update reliability checks and verify desktop/mobile layout.

## Non-goals

- Project creation, bulk processing, automatic acceptance, or a chat interface.
- Changing AI classification, Notes, Tasks, Calendar, Projects, or database tables.
- Migrating or deleting existing resolved Inbox records.

## Primary object and screen job

- Primary object: one unresolved Inbox record.
- Screen job: explicitly decide whether it becomes a task or a note.
- Inspector: none; the decision stays in the row.

## Data contract and migration

- New records remain `open` or `needs_review` with empty `linkedType`/`linkedId`.
- A chosen outcome sets one linked object and marks the source `processed`.
- `sourceInboxId` remains the idempotency key. No migration is required.

## Acceptance criteria

1. Capture creates one unresolved record and zero tasks/notes.
2. Each row visibly offers `Сегодня`, `В бэклог`, and `Заметка`.
3. The destination is visible before confirmation.
4. Choosing an outcome creates exactly one object and removes the source from active Inbox.
5. Repeated handling cannot create duplicate objects.
6. The row has no assistant proposal, hidden alternatives, or project action.
7. Desktop and mobile have no horizontal page overflow.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser: `http://127.0.0.1:4173/?fresh=146`
- Desktop 1280px and mobile 390px; measure page overflow and action fit.

## Risks and rollback

- Classification can still suggest an imperfect destination list, but the user chooses the
  object type and can edit the result afterwards.
- Rollback boundary: Inbox row rendering, action handling, related CSS, and reliability
  assertions.

## Handoff prompt

Implement the explicit three-outcome Inbox described here. Preserve existing state and
idempotency, keep the row compact, and do not extend the stage into Projects or AI chat.
