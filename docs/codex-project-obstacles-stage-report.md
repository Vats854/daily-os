# Projects: obstacles and stage control

## What changed

- Added manual project-stage proposals with a target stage and a short reason.
- Added explicit confirm and reject actions for pending stage transitions.
- Added project obstacles with severity, close action, and audit events.
- Kept stage changes confirmation-first: a proposal never changes the active stage directly.
- Preserved the existing linked-task workflow in the same project canvas.

## Why

Projects need to answer two operational questions without turning into a dashboard: what blocks progress, and what must be confirmed before the project advances. These controls now live next to the journey context instead of in a separate inspector.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/codex-project-obstacles-stage-report.md`

## Checks run

- `npm run check`
- `git diff --check`
- Browser console warning/error check

## Browser verification

- URL: `http://127.0.0.1:4174/?fresh=123`
- Desktop viewport: 1280 px
- Project canvas width: 717 px
- Horizontal overflow: false
- Manual stage form: present
- Obstacle form: present
- Open obstacle rows: 1
- Mobile viewport: 390 x 844 px
- Mobile workspace width: 358 px
- Mobile horizontal overflow: false
- Browser warnings/errors: none

## Remaining risks

- Stage and obstacle actions persist through the existing single-state JSON sync, not normalized project tables.
- AI `journey_review` still proposes from demo heuristics; deeper evidence-based review remains a later backend/AI slice.
- This pass intentionally did not mutate the user's saved project data during browser verification.
