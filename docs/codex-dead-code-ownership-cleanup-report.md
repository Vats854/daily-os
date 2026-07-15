# Dead code ownership cleanup report

## What changed

- Removed 39 top-level functions that had no remaining call/reference site after the
  production shell became the only render path.
- Reduced `public/app.js` from 5714 lines before the shell cleanup to 4738 lines.
- Added a reliability contract that fails when a top-level function has only its own
  declaration as a source occurrence.
- Bumped assets and service-worker cache to v139.

## Why

Retired dashboard renderers made `app.js` difficult to reason about and increased the
chance of editing the wrong UI. Removal was performed as an iterative reference-count
cascade: each batch contained only functions with zero call/reference sites, followed by
syntax and full reliability tests.

## Files edited

- `public/app.js`
- `public/index.html`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/dead-code-ownership-cleanup.md`

## Checks run

- Required Node syntax checks
- `npm run check` after every deletion batch
- Final reliability suite including the new dead-function contract
- 7/7 task-state tests
- `git diff --check`

## Browser verification

Route: `http://127.0.0.1:4174/?fresh=139`

- All eight modules opened with the expected active module and heading.
- One production shell remained throughout.
- Desktop 1280x900: main panel 984px, overflow false.
- Mobile 390x844: main panel 390px, overflow false.

## Remaining risks

- Null-safe legacy element bindings still remain near the end of `app.js`; their callbacks
  keep some otherwise retired helpers reachable by textual analysis.
- `styles.css` still includes retired dashboard selectors.
- Next smallest valuable stage: remove legacy element-bound listeners, rerun the orphan
  function cascade, then create selector ownership coverage before CSS deletion.
