# Stage: Sync diagnostics

## Outcome

The user can click the account sync status and immediately understand whether Daily OS
is saved locally, syncing, safely stored in Supabase, blocked by setup, or waiting for a
conflict decision, then retry a failed save without reloading the app.

## Verified current state

- Revision-safe writes, serialization, pending-snapshot coalescing, and conflict backup
  exist in the production shell.
- The account rail only shows a short status string; revision, last save, pending work,
  and actionable errors are available internally but not inspectable.
- A failed non-conflict write can only be retried indirectly by changing another object.

## In scope

- Make the account sync label a compact status button.
- Add one anchored popover with state, last cloud save, revision, pending/in-flight state,
  account identity, and the current actionable error.
- Add manual retry for non-conflict failures.
- Keep conflict resolution in the existing decision toast.
- Verify desktop and mobile fit.

## Non-goals

- A sync dashboard or separate navigation module.
- Network history, request logs, or developer telemetry.
- Field-level conflict merge.
- A second persistence system.

## Screen job and behavior

Primary object: current save queue. The popover is opened from the account rail, closes
on outside click or Escape, and never reserves workbench width. Retry writes the current
local snapshot through the existing revision-safe queue.

## Acceptance criteria

1. Status is keyboard-accessible and communicates its state without color alone.
2. Popover reports account, last cloud save, revision, and pending work.
3. Retry is visible only for actionable non-conflict failures and uses the current queue.
4. Conflict state points to the existing version chooser instead of offering a blind retry.
5. No desktop or mobile page overflow.
6. Required checks and reliability contracts pass.

## Verification

Run the required syntax/check commands and `git diff --check`. Verify `/?fresh=<version>`
at 1280 x 720 and 390 x 844, including open popover width and console errors.

## Risks and rollback boundary

This stage changes only account-rail presentation and queue retry invocation. It does not
change the persisted state shape or database schema.

## Handoff prompt

Work in `/Users/maffaka/Documents/New project`. Read `AGENTS.md`, `PRODUCT.md`,
`DESIGN.md`, and `docs/stages/sync-diagnostics.md`. Add a compact sync-status popover and
manual retry through the existing safe queue. Preserve the dirty worktree, bump versions,
run all checks, verify desktop/mobile, and write `docs/codex-sync-diagnostics-report.md`.
