# AI Task Decomposition Report

## What changed

- Added `Разбить на шаги` to the selected task command menu.
- Added a bounded Gemini endpoint for task decomposition in local Node and Vercel runtimes.
- Added a deterministic local fallback when Gemini is unavailable.
- Added an editable, temporary draft inside task detail: step title, estimate, add, remove, cancel.
- Added explicit `Добавить подзадачи` confirmation. AI never writes subtasks directly.
- Added atomic-task handling so a concrete task can return `Декомпозиция не нужна`.
- Preserved optional estimates on generated subtasks.

## Why

Large tasks need a practical route from intention to executable work, but automatic task mutation would create noise. The confirmation-first draft keeps AI useful and reversible.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `server.js`
- `api/ai/task-decompose.js`
- `scripts/reliability-check.mjs`
- `docs/stages/task-ai-decomposition.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `node --check api/ai/task-decompose.js`
- `npm run check` (all contracts and 11 state tests passed)

## Browser verification

- Desktop: command opened, local fallback produced five editable steps, edited draft persisted only after confirmation, no page overflow.
- Desktop measurements: main 520 px, task detail 464 px, overflow false.
- Mobile 390x844: detail 390 px, menu 300 px, menu right edge 374 px, overflow false.
- Console errors: none.
- Test subtasks were removed after verification.

## Remaining risks

- Gemini output quality depends on the configured model and task context.
- The current local fallback is deliberately generic except for resume/CV tasks.
- Mobile automated clicking of the below-fold menu command was blocked by the browser driver; mobile layout and command presence were verified independently.
