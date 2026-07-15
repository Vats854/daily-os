# Stage: Inbox decision flow

## Observable outcome

After capture, the user sees what the assistant understood, the proposed destination, and why. No task, note, or project is created until the user confirms one explicit action.

## Verified current state

- `processInbox()` immediately creates a task, note, or project and marks the incoming item processed.
- `linkedType`/`linkedId` represent the single resulting object.
- v140 prevents repeated conversion from producing new duplicates.
- The production shell renders Inbox through `renderSimpleInboxRow()`.

## In scope

- Change capture from auto-apply to propose-then-confirm.
- Show interpretation, proposed destination, reason, and review status in each Inbox row.
- Provide explicit actions for task, note, and project outcomes.
- Preserve existing processed incoming items and linked objects.
- Verify the core capture-to-result flow on desktop and mobile.

## Non-goals

- Chat UI, bulk Inbox processing, new database tables, or a new AI provider.
- Redesigning Tasks, Calendar, Notes, Habits, or Projects.
- Automatically deleting unrelated legacy objects with matching titles.

## Primary object and screen job

- Primary object: one raw Inbox item.
- Screen job: decide what the item becomes.
- Inspector: none; the decision remains in the row to avoid a duplicate representation.

## Data contract and migration

- New items remain `open` or `needs_review` until confirmation.
- `parsed` remains the assistant proposal.
- `linkedType` and `linkedId` are set only after confirmation.
- Existing processed items remain valid without migration.
- Created objects keep `sourceInboxId` for idempotency.

## Acceptance criteria

1. Capture creates one Inbox item and zero tasks/notes/projects.
2. The row shows proposed object, destination, and reason.
3. Confirming the proposal creates exactly one linked object.
4. After confirmation the row exposes only `Открыть ...`; a note may be explicitly converted once to a task.
5. Refresh preserves the item and its linked result.
6. No horizontal page overflow at desktop or mobile widths.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser: `http://127.0.0.1:4173/?fresh=141`
- Desktop 1280px and mobile 390px; report overflow and row/action fit.

## Risks and rollback

- AI classification may be wrong; explicit alternatives keep the user in control.
- Rollback boundary: `processInbox`, Inbox action helpers, row rendering, and related styles.

## Handoff prompt

Implement and verify the propose-then-confirm Inbox contract described in this brief. Preserve v140 idempotency and existing user data; do not add new modules.
