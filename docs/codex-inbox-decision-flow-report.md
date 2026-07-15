# Inbox Decision Flow Report

## What changed

- Inbox capture now creates a raw inbox item only; it no longer silently creates a task, note, or project.
- Each raw item shows the assistant's proposed object type, destination, and reason.
- The user confirms the proposal with one primary action or opens `Другой вариант` to choose task, note, or project explicitly.
- Confirmed results are linked back to their source inbox item and can be opened from the same row.
- Repeated confirmation is idempotent: one inbox item produces one linked result.
- Health memory is written only after an explicit note confirmation.

## Why

The previous flow mixed capture, classification, and mutation in one click. That made it unclear where text went and caused duplicate tasks. The new contract separates capture from decision while preserving assistant autonomy as a visible recommendation.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/inbox-decision-flow.md`

## Checks run

- `npm run check`
- JavaScript syntax checks for app, service worker, and server
- Reliability contracts, including confirmation-before-creation
- 7 task-state serialization and workflow tests

All checks passed.

## Browser verification

- Desktop capture -> proposal -> confirmation -> reload completed successfully.
- Before confirmation, the proposed task count was `0`.
- After confirmation, the task count was `1`.
- After reload, the task count remained `1`.
- Desktop horizontal overflow: false.
- Desktop main working panel: 984 px.
- Empty detail inspector: hidden.
- Mobile viewport: 390 x 844.
- Mobile horizontal overflow: false.
- Mobile inbox row: 358 px within a 390 px viewport.

## Remaining risks

- Classification quality still depends on the AI response and deterministic fallback rules.
- Existing legacy inbox items retain their previous linked results; this stage does not migrate or delete user data.
- A later stage should add richer proposal editing before confirmation when real routine usage reveals which fields matter most.
