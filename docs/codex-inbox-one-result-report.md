# Inbox one-result fix

## What changed

- Incoming items now expose one stable result instead of alternating between note and task actions.
- A saved note can be explicitly converted once with `Сделать задачей`.
- Created tasks and notes keep `sourceInboxId`, making repeated actions idempotent.
- Legacy inbox task duplicates with the same source signature are consolidated when the note is converted.
- Result buttons now say `Открыть задачу` or `Открыть заметку`.

## Why

The previous `linkedType` value was overwritten whenever the opposite action was used. That made the UI offer the previous action again and allowed one incoming item to create many duplicate tasks.

## Files edited

- `public/app.js`
- `public/index.html`
- `public/sw.js`

## Verification

- `npm run check`: 7/7 state tests passed; all reliability contracts passed.
- Browser scenario: a saved note converted once, then exposed only `Открыть задачу`; exact task title count was `1`.
- Browser layout: page overflow `false`; app width `1280px`; task detail visible `true`.

## Remaining risk

Legacy duplicates are only consolidated when their original incoming item is converted again; unrelated tasks with the same title are not globally deleted.
