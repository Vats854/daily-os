# Sync diagnostics report

## What changed

- Turned the account sync label into an accessible status control.
- Added a compact overlay with account, last cloud save, revision, pending queue, current
  state explanation, and actionable error copy.
- Added a manual retry that sends the current snapshot through the existing serialized,
  revision-safe queue.
- Added a dedicated mobile status control in the main topbar.
- Kept panel visibility as ephemeral runtime UI so it is never persisted or synced.
- Added reliability contracts for the diagnostics surface and safe retry path.

## Why

The previous status string could say that sync failed but did not explain whether local
work was safe, when the cloud last saved, or how to retry. The new popover answers those
questions without adding a settings screen or permanent dashboard surface.

## Files edited

- `public/index.html`
- `public/task-core.css`
- `public/app.js`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/stages/sync-diagnostics.md`

## Checks run

- `node --check public/app.js`
- `node --check public/supabase-client.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

All passed: 14 reliability contracts and 3 task-state lifecycle tests.

## Browser verification

Route: `http://127.0.0.1:4174/?fresh=127`

- Desktop `1280 x 720`: overflow `false`; panel visible; width `292px`; fully inside the
  viewport; no console warnings or errors.
- Mobile `390 x 844`: overflow `false`; mobile status button visible; panel width `292px`;
  fully inside the viewport.
- Loaded asset: `app.js?v=127`.

## Remaining risks

- Local development can verify local/setup presentation but not a real Supabase revision
  conflict. Production still needs one signed-in laptop/phone smoke test.
- The panel intentionally reports the current snapshot-level revision, not per-object
  sync details.

## Next smallest valuable stage

Run the production two-device smoke test, then begin a short real-use feedback loop. The
next product build should be selected from observed friction rather than adding another
module speculatively.
