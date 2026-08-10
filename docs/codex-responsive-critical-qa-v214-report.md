# Responsive critical QA v214 report

## What changed

- Released the Projects containment fix as v213 through PR #3.
- Checked nine active work surfaces at 1440, 1024, and 390 CSS pixels in light and dark modes.
- Found one shared critical defect: the mobile rail hid Inbox, Notes, Projects, and Log.
- Changed the mobile rail to an internally scrollable row exposing all eight product modules.
- Bumped application assets and the service-worker cache to v214.

## Why

At zoom-equivalent widths Projects could widen the document and shift global navigation
outside the viewport. On mobile, four primary modules had no reachable navigation target.
Both failures blocked access to existing product objects and were therefore in the
critical QA scope.

## Files edited

- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `docs/stages/responsive-critical-qa-v213.md`
- `docs/codex-responsive-critical-qa-v214-report.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Browser verification

- Screens: Today, Tasks, Calendar, Habits, Focus, Notes, Projects, Inbox, Log.
- Themes: light and dark.
- Viewports: 1440x900, 1024x800, 390x844.
- All 54 screen/theme/viewport states: page overflow false.
- Main widths: 1084 px at 1440, 740 px at 1024, 390 px on mobile; Notes uses its intentional split width on desktop.
- Headings remained inside the viewport.
- Projects at 1024 uses an internally scrolling project index; at 1440 it keeps the wide two-column workbench.
- Mobile rail: client width 390 px, scroll width 524 px, page width 390 px.
- Inbox, Notes, Projects, and Log were opened from the mobile rail successfully.

## Remaining risks

- Calendar task lanes, the Project index, and the Journey track intentionally scroll
  inside their own containers on narrow screens.
- This stage did not consolidate historical CSS; the next smallest valuable stage is a
  dedicated cascade cleanup after a period of routine use.
