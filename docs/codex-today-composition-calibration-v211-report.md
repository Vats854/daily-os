# Today composition calibration v211

## What changed

- Increased the desktop icon rail/sidebar geometry from 60/260 px to 64/292 px so labels and counters remain visible.
- Aligned the Today header, composer, focus, task list, and evening review to one 1180 px maximum work column.
- Removed the nested Today list padding that previously shifted the accepted plan away from its header and composer.
- Tightened the space between quick capture and the daily focus.
- Turned the existing evening review into a compact action surface with restrained border, tonal background, and hover feedback.
- Advanced app asset and service-worker cache versions to v211.

## Why

The supplied wide-screen screenshot showed clipped sidebar counters and a fragmented Today composition: header, composer, focus, tasks, and review occupied different horizontal measures with excessive empty space between them. The change preserves the existing accepted-plan structure while making it read as one operational workbench.

## Files edited

- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `docs/stages/today-composition-calibration-v211.md`
- `docs/codex-today-composition-calibration-v211-report.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`
- 13 task-state smoke tests passed.

## Browser verification

Verified Today in light and dark modes at 2048×990, 1440×900, and 390×844.

- 2048 px: main width 1692 px; Today workbench/header/composer/review all 1180 px at x612.
- 1440 px: main width 1084 px; Today workbench width 991 px.
- 390 px: main width 390 px; Today workbench width 358 px.
- Page overflow: false at every viewport.
- Sidebar width: 292 px; all descendants remain inside its right edge.
- Workbench and review fit: true.
- Inspector visible: false with no selected object.
- Dark/light review contrast remains token-driven.

## Remaining risks

- At wide desktop sizes the accepted plan is intentionally capped at 1180 px; screens with unusually long task metadata still rely on existing row wrapping.
- The in-app browser again rendered a temporary pale strip in one screenshot even though the app, main pane, body geometry, and computed backgrounds covered the full 900 px viewport. Measurements showed no DOM or CSS gap, so no compensating rule was added.

## Next smallest valuable stage

No follow-up is required for Today composition. Any further change should be based on a new screenshot or a specific interaction defect rather than another general polish pass.
