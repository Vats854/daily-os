# Stage: Cloud-safe daily use

## Outcome

Daily OS can be edited quickly on a laptop and phone without overlapping saves from one
device creating false conflicts, and without an unresolved conflict silently overwriting
the newer cloud version.

## Verified current state

- `daily_os_states` has an optimistic `revision` and an atomic
  `save_daily_os_state` RPC.
- The client keeps one local snapshot and a normalized notes mirror in Supabase.
- Cloud saves are debounced, but already-started requests are not serialized.
- A conflict loads the cloud state and keeps the local snapshot under
  `CONFLICT_BACKUP_KEY`.
- The legacy RPC fallback performs an unconditional upsert and therefore cannot protect
  newer data from another device.

## In scope

- Serialize cloud writes and coalesce rapid edits into the latest pending snapshot.
- Pause cloud writes until an explicit conflict choice is made.
- Preserve conflict metadata and present the two choices in calm product language.
- Refuse unsafe legacy writes and explain the required Supabase upgrade.
- Add automated reliability contracts for these behaviors.

## Non-goals

- Field-by-field or CRDT merging.
- Realtime collaboration or multi-user workspaces.
- A new database schema beyond the already-versioned state RPC.
- New product modules or visual redesign.

## Primary object and screen job

The primary object is the signed-in user's complete Daily OS state snapshot. Sync status
stays secondary in the shell. A conflict appears as a compact decision toast; it does not
replace the current workspace or open a permanent inspector.

## Data contract and migration

- Every cloud write supplies the last loaded/saved revision.
- At most one state write is in flight per browser tab.
- While a write is in flight, later local edits replace one pending snapshot; they are
  saved immediately after the current write succeeds.
- On `SYNC_CONFLICT`, the pending queue stops, the local snapshot is preserved with local
  and remote metadata, and no new cloud write occurs until the user chooses a version.
- Missing revision RPC is a setup error, not permission to perform an unconditional
  upsert. Local persistence remains available.

## Acceptance criteria

1. Rapid local edits cannot launch concurrent state writes from one tab.
2. The latest pending snapshot is saved after the active request completes.
3. An unresolved conflict blocks additional cloud writes.
4. Choosing cloud clears the backup without writing; choosing local writes against the
   currently loaded cloud revision.
5. Missing revision infrastructure produces actionable `SYNC_UPGRADE_REQUIRED` copy.
6. Existing checks plus sync reliability contracts pass.
7. Desktop and mobile have no horizontal page overflow and the conflict UI fits.

## Verification

Run `node --check public/app.js`, `node --check public/sw.js`, `node --check server.js`,
`npm run check`, and `git diff --check`. Verify `/?fresh=<version>` at 1280 x 720 and
390 x 844. Record overflow, active workbench width, conflict toast fit, and console errors.

## Risks and rollback boundary

- An installation without the RPC will temporarily remain local-only until
  `db/supabase-state-sync.sql` is run; this is intentional loss prevention.
- Normalized note rows remain a mirror written only after the revisioned snapshot save.
- Rollback is limited to the cloud queue, conflict presentation, and legacy fallback;
  no user-state shape changes are introduced.

## Handoff prompt

Work in `/Users/maffaka/Documents/New project`. Read `AGENTS.md`, `PRODUCT.md`,
`DESIGN.md`, and `docs/stages/cloud-safe-daily-use.md`. Preserve the dirty worktree.
Serialize/coalesce cloud saves, block writes during unresolved conflicts, replace unsafe
legacy upserts with an actionable upgrade error, verify desktop/mobile, bump asset/cache
versions, and write `docs/codex-cloud-safe-daily-use-report.md`.
