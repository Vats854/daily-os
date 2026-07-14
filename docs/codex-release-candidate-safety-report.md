# Release candidate safety report

## What changed

- Added a versioned `daily-os-backup` JSON envelope with export timestamp and state.
- Added `Скачать JSON` and `Восстановить` actions to the existing sync/service popover.
- Added validation for malformed, foreign, unsupported, and oversized backup files.
- Added an import preview with task, note, habit, and project counts before confirmation.
- Added a pre-import rollback snapshot and `Вернуть состояние до импорта` action.
- Confirmed imports pass through current normalization, local persistence, safe cloud queue,
  and the assistant audit log.
- Added backup round-trip/rejection tests and static release contracts.

## Why

Daily OS now contains routine-use data across several modules. Before deploying the next
working version, the user needs a portable escape hatch that does not depend on a single
browser, Supabase row, or future migration.

## Files edited

- `public/app.js`
- `public/index.html`
- `public/task-core.css`
- `public/task-state.js`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `scripts/task-state-smoke.test.mjs`
- `docs/stages/release-candidate-safety.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

All checks passed. Five state tests passed, including backup round-trip, rejection of
foreign/unsupported files, task persistence, and the complete daily workflow snapshot.

## Browser verification

Route: `http://127.0.0.1:4174/?fresh=128`

Desktop `1280 x 720`:

- page overflow: false;
- main panel width: 984 px;
- empty inspector visible: false;
- sync/backup panel width: 292 px;
- panel fits viewport: true.

Mobile `390 x 844`:

- page overflow: false;
- main panel width: 390 px;
- empty inspector visible: false;
- sync/backup panel width: 292 px;
- panel bounds: 82–374 px;
- console errors: none.

Visible active-shell buttons were audited: module navigation, sync diagnostics, export,
and restore are enabled. No additional fake primary action was exposed by this stage.

## Remaining risks

- Backup files are plain JSON and can contain private notes and tasks. The UI states this
  before export; encrypted archives remain outside this MVP.
- Cross-version migrations beyond current `normalizeState()` are not yet formalized.
- Browser automation did not select a real private file, to avoid mutating the user's
  current data. Parser, preview wiring, confirmation wiring, and rollback are covered by
  automated tests and code contracts.

## Next smallest valuable stage

Deploy v128, create one manual backup, then use the app for several real days. Collect
workflow failures as concrete events before adding new modules or redesigning surfaces.
