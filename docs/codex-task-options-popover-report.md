# Task Options Popover Report

Date: 2026-07-11

## What changed

- Removed the always-expanded task properties form from the inspector.
- Kept the task title, description, completion checkbox, and compact metadata summary visible.
- Moved date, priority, list, status, duration, tags, completion, and deletion into a contextual `…` popover.
- Made the `…` button on a task row open the selected task with the same popover already expanded.
- Added a compact metadata summary that also opens the popover.
- Bumped assets and service-worker cache to `v90`.

## Why

Task properties are secondary controls. Showing every property permanently made a simple task feel like a large settings form. The new interaction follows the referenced task-tracker pattern: content remains visible, properties appear only when requested.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`

## Checks

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Browser verification

- Inspector opens in its calm state without the properties form.
- Header `…` opens and closes the properties popover.
- Row `…` selects the task and opens the same popover.
- Popover exposes date, priority, list, status, duration, tags, completion, and delete controls.

Screenshots:

- `docs/audits/foundation-reset/06-task-options-popover.png`
- `docs/audits/foundation-reset/07-task-detail-calm.png`
