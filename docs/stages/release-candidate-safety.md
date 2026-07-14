# Stage: Release candidate safety

## Outcome

The user can create a portable backup, inspect and restore a valid Daily OS backup, undo
the latest import, and rely on an automated release smoke test before the first routine-use
deployment.

## Verified current state

- Local and revision-safe cloud persistence work through one snapshot boundary.
- Core task lifecycle tests cover capture, task update, schedule, focus, completion, audit,
  serialization, and reload.
- There is no user-facing portable backup or guarded import path.
- Importing arbitrary JSON would currently require manual localStorage manipulation.

## In scope

- Versioned JSON backup envelope with export timestamp and Daily OS state.
- Local download from the sync/service popover.
- File selection, structural validation, preview counts, and explicit confirmation.
- Automatic pre-import rollback snapshot and one-click restore.
- Expanded smoke coverage for backup round-trip and primary object collections.
- Audit visible primary actions; hide or label any obvious non-action found in the active
  shell.

## Non-goals

- Cloud file storage, encrypted archives, attachments, or scheduled backups.
- Cross-version data migrations beyond current state normalization.
- New product modules or visual redesign.

## Data contract

Backup envelope: `format`, `version`, `exportedAt`, and `state`. Only format
`daily-os-backup` version `1` is accepted. Import never writes until parsing succeeds and
the user confirms. The pre-import envelope remains in localStorage until replaced by a
later confirmed import.

## Acceptance criteria

1. Export downloads a valid versioned JSON envelope.
2. Malformed, foreign, or unsupported files do not change state.
3. A valid file shows task/note/habit/project counts before confirmation.
4. Confirmed import normalizes, saves locally, queues safe cloud sync, and writes an audit
   event.
5. The previous state can be restored after import.
6. Automated tests prove backup round-trip and rejection behavior.
7. Desktop/mobile have no overflow and import confirmation fits.

## Verification

Run all required checks plus the backup tests. In browser verify the service popover,
file chooser trigger, confirmation surface, and layout at 1280 x 720 and 390 x 844.

## Risks and rollback boundary

Backups contain the user's private Daily OS data in plain JSON and remain on their own
device unless they choose to share the file. This stage does not alter database schema.

## Handoff prompt

Work in `/Users/maffaka/Documents/New project`. Read `AGENTS.md`, `PRODUCT.md`,
`DESIGN.md`, and `docs/stages/release-candidate-safety.md`. Implement versioned local
export/import with validation, preview, rollback, and tests. Preserve the dirty worktree,
verify desktop/mobile, bump assets/cache, and write the release-candidate report.
