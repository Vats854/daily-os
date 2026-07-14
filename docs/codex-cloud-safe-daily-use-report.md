# Cloud-safe daily use report

## What changed

- Replaced overlapping debounced cloud writes with one serialized save pipeline.
- Coalesced rapid edits into one latest pending snapshot while a request is active.
- Paused all cloud writes while a revision conflict awaits an explicit choice.
- Added local/remote revision and timestamp metadata to conflict backups.
- Reworded the conflict surface as a compact version choice with cloud/local times.
- Removed the unconditional legacy Supabase upsert. Missing revision infrastructure
  now returns `SYNC_UPGRADE_REQUIRED` and leaves the current device's local data intact.
- Added reliability contracts for serialization, coalescing, conflict blocking, and
  the absence of unsafe legacy writes.

## Why

The previous debounce prevented nearby timers but did not prevent two already-started
requests from using the same revision. Fast edits from one tab could therefore create a
false multi-device conflict. The legacy fallback also allowed last-write-wins data loss.
This stage makes failure visible and recoverable instead of silent.

## Files edited

- `public/app.js`
- `public/supabase-client.js`
- `public/index.html`
- `public/sw.js`
- `scripts/reliability-check.mjs`
- `docs/deployment.md`
- `docs/stages/cloud-safe-daily-use.md`

## Checks run

- `node --check public/app.js`
- `node --check public/supabase-client.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

All passed. The reliability suite reports 12 contracts and the task-state suite reports
3 passing lifecycle tests.

## Browser verification

Route: `http://127.0.0.1:4174/?fresh=126`

- Desktop `1280 x 720`: page overflow `false`; active shell width `1280px`; inspector
  hidden without a selected object; `app.js?v=126` loaded.
- Mobile `390 x 844`: page overflow `false`; active shell width `390px`; inspector
  hidden without a selected object.
- The existing Journal workbench renders normally after the sync changes.

## Remaining risks

- True cross-device contention needs a signed-in two-browser/manual smoke test because
  the local development route runs without Supabase credentials.
- Conflict resolution is whole-snapshot choice, not field-level merge.
- Normalized notes remain a mirror written after a successful revisioned state save.
- Existing installations must run `db/supabase-state-sync.sql`; until then their cloud
  writes are intentionally blocked while local persistence continues.

## Next smallest valuable stage

Add a visible sync diagnostics drawer available from the account status: last successful
save, local pending state, current revision, and a manual retry. Then run a real signed-in
phone/laptop conflict smoke test against production without adding another product module.
