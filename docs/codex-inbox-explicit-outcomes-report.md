# Inbox explicit outcomes report

## What changed

- Replaced the assistant-proposal card and hidden `Другой вариант` menu with three
  visible outcomes: `Сегодня`, `В бэклог`, and `Заметка`.
- Added the target task list or note folder directly inside each outcome button.
- Added explicit pending copy: doing nothing leaves the record in Inbox.
- Removed the unreachable Inbox project/auto-accept path from the production handler.
- Preserved `sourceInboxId` and linked-object checks for idempotent task/note creation.
- Updated the empty-state copy and reliability contract.

## Why

Inbox should be a decision queue, not a screen for interpreting an assistant proposal.
The user can now understand every available result before clicking, while an untouched
record remains safely unresolved.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/inbox-explicit-outcomes.md`
- `docs/codex-inbox-explicit-outcomes-report.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- All reliability contracts and 10 state tests passed.

## Browser verification

- Route: `http://127.0.0.1:4174/?fresh=146`
- Desktop 1280px:
  - page overflow: false;
  - main panel width: 984px;
  - Inbox actions width: 364px;
  - inspector: hidden;
  - primary action contrast: white on `rgb(24, 32, 29)`.
- Mobile 390px:
  - page overflow: false;
  - Inbox row width: 358px;
  - actions width: 350px;
  - actions overflow: false;
  - three outcome columns: approximately 113px each.
- Functional flow verified: capture created one unresolved record; `Заметка` created one
  note in `Личное`; the source disappeared from active Inbox. A temporary mobile record
  was deleted after layout verification.

## Remaining risks

- AI classification still chooses the suggested destination list/folder. The created
  object can be edited afterwards, but inline destination selection is not in this stage.
- Existing historical project-linked Inbox records remain readable; new project creation
  from Inbox is intentionally absent.

## Next smallest valuable stage

Add a compact destination picker to each outcome only if routine use shows that the
assistant frequently selects the wrong list. Do not add it preemptively.
