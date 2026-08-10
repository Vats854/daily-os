# Zoom breakpoint v215 report

## What changed

- Aligned the active `task-core.css` shell breakpoints with the base 780 px mobile breakpoint.
- Mobile rules now apply through 780 px; desktop rules begin at 781 px.
- Bumped application assets and the service-worker cache to v215.

## Why

Between 721 and 780 CSS pixels the base shell used a one-column mobile grid while later
task-core rules still positioned rails and the main pane as desktop columns. The main pane
collapsed to 56 px and its content painted across the viewport, matching the reported
zoomed-browser screenshot.

## Files edited

- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `docs/codex-zoom-breakpoint-v215-report.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Browser verification

- Reproduced before the fix at 721 and 760 px: main width 56 px.
- After the fix at 721, 740, 760, and 780 px: main width equals viewport width, page overflow false, heading left edge 0.
- At 781, 800, 840, 900, 960, and 1024 px: desktop shell fits with page overflow false.
- Checked Today, Tasks, Calendar, Habits, Focus, Notes, Projects, Inbox, and Log at 721, 760, 780, and 781 px in light and dark themes: 72 states, zero failures.
- Visually inspected Projects at 760x800; header, composer, project index, canvas, and bottom navigation remain inside their intended regions.

## Remaining risks

- Browser zoom can produce many effective CSS widths, so future responsive QA should
  always include both sides of every shell breakpoint, not only canonical device widths.
