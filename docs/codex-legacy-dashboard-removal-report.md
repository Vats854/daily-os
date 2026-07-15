# Legacy dashboard removal report

## What changed

- Deleted the retired dashboard archive from `public/index.html`.
- Reduced `render()` to the single production `renderSimpleApp()` path.
- Updated reliability contracts to reject legacy view IDs and secondary shells.
- Bumped assets and service-worker cache to v138.

## Why

The v137 archive was no longer live, but it still shipped 300 lines of retired markup and
left a misleading fallback path in the application renderer. Daily OS now has one HTML
shell and one render owner.

## Files edited

- `public/index.html`
- `public/app.js`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/legacy-dashboard-removal.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`: all reliability contracts and 7/7 state tests passed
- `git diff --check`

## Browser verification

Route: `http://127.0.0.1:4174/?fresh=138`

- Production shell count: 1
- Legacy view IDs: 0
- Template count: 0
- Desktop 1280px: page overflow false, main panel 984px on Log, unused detail rail 0px
- Mobile 390x844: page overflow false, main panel 390px
- Capture, tasks, calendar, habits, focus, notes, projects, and log all opened with the
  requested module active, one shell, zero legacy IDs, and no horizontal overflow.

## Remaining risks

- Legacy-only functions and CSS declarations remain mixed with shared production code.
- The next stage should create an ownership/coverage map and delete those declarations in
  small batches rather than attempt an unsafe whole-file rewrite.
