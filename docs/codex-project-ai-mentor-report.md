# Project AI mentor report

## What changed

- Added a project-local AI mentor review to the Projects workbench.
- Added local and Vercel `POST /api/ai/journey-review` endpoints backed by Gemini.
- Reviews receive bounded structured evidence: project metadata, linked task summaries, open obstacles, and current load.
- The project canvas now shows a compact diagnosis, objection, next move, and evidence list.
- AI stage suggestions reuse the existing `needs_confirmation` transition flow. The model cannot change a journey stage directly.
- Added a deterministic local fallback so project review remains useful when Gemini is unavailable.
- Added reliability contracts for bounded context, confirmation-first transitions, and fallback behavior.

## Why

The mentor is meant to challenge project decisions using real project state, not become another chat or decorative assistant panel. Keeping it inside the selected project preserves the Projects screen job and makes every recommendation inspectable.

## Files edited

- `api/ai/journey-review.js`
- `server.js`
- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/project-ai-mentor.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `node --check api/ai/journey-review.js`
- `npm run check`
- `git diff --check`

All checks passed, including 11 task-state tests and the new AI mentor reliability contracts.

## Browser verification

Verified at `http://127.0.0.1:4174/?fresh=149`.

- Desktop `1280x720`: no page overflow; main panel `984px`; project workspace `915px`; project canvas `717px`; mentor `717px`.
- Mobile `390x844`: no page overflow; project index and canvas stack vertically; canvas `358px`; mentor `358px`; mentor evidence layout becomes one column.
- No browser console errors.
- Local fallback produced a diagnosis, objection, next action, and evidence.
- A suggested `Испытание -> Узкое место` transition remained `needs_confirmation` with explicit reject/confirm controls.

## Remaining risks

- Gemini output quality depends on the configured model and available project evidence.
- The current MVP stores only the latest mentor review on the project rather than a separate review history.
- The local browser test used the deterministic fallback; the production endpoint still needs one live Gemini smoke test after deployment.
