# Inbox and notes reliability report

## What changed

- Replaced the ambiguous Inbox command `Разобрать` with `Сохранить` in the active shell.
- Replaced internal Inbox status labels with Russian user-facing states.
- Added a clear result contract to every Inbox row: object type plus destination.
- Made linked objects the primary action: `Открыть` goes directly to the created task,
  project, or note.
- Renamed conversion actions to outcome-oriented commands such as `Задача сегодня` and
  `Сохранить заметкой`.
- Included raw Inbox records in global search alongside resulting tasks and notes.
- Hardened note-row navigation so row and explicit open-button interactions always select
  the Notes module and open the editor.

## Why

The previous UI created a task or note immediately but still presented the capture as an
unresolved item. Internal status words and generic actions made it impossible to tell what
happened or where the content went. The new flow makes the stored object and destination
explicit without changing the existing data schema or AI classification behavior.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/inbox-notes-reliability.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check` — 7/7 state-contract tests passed
- `git diff --check`

## Browser verification

Tested at `http://127.0.0.1:4174/?fresh=135`.

- Captured `Идея для проверки заметки Inbox 135` from the active Inbox composer.
- Result showed `Заметка · Заметки · Личное` and opened the linked note directly.
- Edited body, tags, and folder; all values survived a full reload.
- Search returned both the original Inbox record and the linked note.
- Desktop at 1280 px: page overflow `false`; main pane 320 px and open note editor 684 px.
- Mobile at 390 x 844: page overflow `false`; editor and main pane both 390 px.
- Browser console warnings/errors: none.

## Remaining risks

- Converting an already linked note into a task preserves the original note and changes the
  Inbox link to the task. This is intentional data preservation, but a future conversion UI
  should explain that both objects remain.
- Notes are still plain text. Rich text, attachments, backlinks, and document version history
  remain outside this stage.
