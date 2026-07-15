# Legacy dashboard isolation report

## What changed

- Moved the retired dashboard markup from a hidden live subtree into
  `#legacyDashboardArchive`, an inert `<template>`.
- Made legacy element-bound event registration null-safe. Shared delegated handlers used
  by task core remain active.
- Changed reliability contracts to require one live production shell and an archived,
  non-live dashboard.
- Bumped application assets and service-worker cache to v137.

## Why

The previous hidden dashboard still participated in document parsing and was required by
legacy listeners. That allowed retired UI or runtime failures to leak into the active task
core. The page now has one live application tree while preserving the old markup only as
an explicit short-lived archive for the next deletion stage.

## Files edited

- `public/index.html`
- `public/app.js`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/legacy-dashboard-isolation.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`: 7/7 tests passed and all reliability contracts passed
- `git diff --check`

## Browser verification

Route: `http://127.0.0.1:4174/?fresh=137`

- Live production shells: 1
- Live `.legacy-app` nodes: 0
- Live `#todayView` nodes: 0
- Archive templates: 1
- Desktop 1440x900: page overflow false, selected main panel 520px, detail visible
- Mobile 390x844: page overflow false, main panel 390px, detail rendered in responsive flow
- All modules opened successfully: capture, tasks, calendar, habits, focus, notes,
  projects, log
- Every checked module kept page overflow false and legacy node count at zero

## Remaining risks

- Retired renderer functions and CSS still remain in the shipped source bundle.
- The archive template still adds HTML bytes even though it has no live DOM presence.
- The next smallest stage is deletion of the archive plus legacy-only renderer and CSS
  ownership mapping, with task-core contracts retained throughout.
