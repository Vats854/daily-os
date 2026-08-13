# Daily OS CSS shell consolidation v216 — report

## What changed

- Added one final containment contract for the active `simple-app` shell.
- Reduced the fixed desktop navigation footprint and allowed the main column to shrink.
- Kept an empty inspector out of layout; selected-object inspectors are inline at wide
  desktop widths and overlay the canvas from 1439px down.
- Contained Projects forms, task tools, and project canvas; the seven-stage journey can
  scroll inside its own strip when needed.
- Contained Today and Habits workbench children.
- Kept Calendar's necessary wide-grid scrolling inside the calendar surface.
- Corrected the Projects mobile header background in dark mode.
- Bumped app assets and the service-worker cache to v216.

## Why

Historical layers declared incompatible shell grids. The latest detail grid had a
minimum width of 1204px before content, which forced the whole page outside laptop or
zoomed viewports. Screen-level rules then leaked that overflow into Projects and other
workspaces.

## Files edited

- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `docs/stages/css-shell-consolidation-v216.md`
- `docs/codex-css-shell-consolidation-v216-report.md`

## Checks run

- `node --check public/app.js` — passed
- `node --check public/sw.js` — passed
- `node --check server.js` — passed
- `npm run check` — passed, including 13 state smoke tests

## Browser verification

Route: `http://127.0.0.1:4173/?fresh=216`

| Viewport | Surface/theme | Page overflow | Main width | Inspector | Key surface |
| --- | --- | --- | ---: | --- | --- |
| 1440x900 | Today/light | false | 1156px | hidden | fits |
| 1440x900 | Calendar/light | false | 1156px | hidden | fits |
| 1440x900 | Habits/light | false | 1156px | hidden | fits |
| 1440x900 | Projects/light | false | 1156px | hidden | fits |
| 1180x820 | all four/dark | false | 896px | hidden | fits |
| 980x760 | all four/dark | false | 724px | hidden | fits |
| 980x760 | Habits selected/dark | false | 724px | overlay | fits |
| 1440x900 | Habits selected/dark | false | 776px | inline, 380px | fits |
| 390x844 | all four/dark | false | 390px | hidden | fits |
| 390x844 | Projects/light | false | 390px | hidden | fits |

Visual screenshots were inspected for Projects in dark laptop/mobile modes and light
mobile mode. The dark mobile header contrast regression found in cycle two was fixed and
rechecked. Calendar owns horizontal scrolling for its time grid; the document does not.

## Remaining risks

- `task-core.css` still contains historical layers. The v216 block is intentionally the
  final authority, but a future cleanup should delete superseded rules module by module.
- Browser verification used local demo state. Unusually long user-generated labels are
  contained by the new min-width/max-width contract but were not exhaustively fuzzed.
- No deployment was performed.

## Next smallest valuable stage

Remove obsolete pre-v200 shell and responsive declarations after screenshot baselines
are captured, keeping v216 geometry as the acceptance reference.
