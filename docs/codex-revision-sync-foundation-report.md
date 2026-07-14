# Revision-safe sync foundation

## What changed

- Added a monotonic `revision` column to the per-user state snapshot.
- Added an atomic Postgres RPC that locks the row, compares the expected
  revision, and either commits the next revision or raises `SYNC_CONFLICT`.
- Updated the client to load and retain the current cloud revision.
- State saves now finish before normalized Notes writes begin.
- Added backward compatibility for deployments that have not run the updated
  SQL yet; those sessions are identified as `sync legacy`.
- Added conflict recovery: preserve the unsaved local state in localStorage,
  load the current cloud state, and show a visible conflict status.
- Added an in-app conflict notification with explicit choices to keep the cloud
  version or restore and intentionally resave the local backup.
- Stopped rendering the hidden legacy dashboard tree on every state change.

## Why

The previous unconditional `upsert` allowed a stale laptop or phone tab to
silently replace a newer full-state snapshot. Revision checks make that failure
detectable and preserve both versions for recovery.

## Files edited

- `db/supabase-state-sync.sql`
- `public/supabase-client.js`
- `public/app.js`
- `public/index.html`
- `public/sw.js`
- `docs/deployment.md`
- `docs/data-model.md`

## Verification

- JavaScript syntax checks pass.
- Project check script passes.
- Diff whitespace check passes.
- Local fallback remains available without Supabase configuration.

## Deployment requirement

Run `db/supabase-state-sync.sql` in the Supabase SQL Editor, then redeploy or
reload the app. Until then saving remains compatible but uses legacy upsert
semantics.

## Remaining risk

Conflict recovery currently keeps the local version as a raw backup rather than
offering a field-by-field merge UI. This is deliberate for the single-user MVP:
no data is silently lost, and merge UX can be added after real conflicts are
observed.
