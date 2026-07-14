# Stage: Production baseline

## Outcome

Daily OS has one active application shell and one verified daily workflow: capture an
input, turn it into a task or note, schedule work, focus, complete it, and see the audit
event after reload.

## Current state

- The active product is the `simple-app` shell in `public/app.js` and
  `public/task-core.css`.
- Eight modules exist: tasks, calendar, habits, focus, notes, projects, inbox, and log.
- State persists locally and as one per-user JSON document in `daily_os_states`.
- Legacy dashboard renderers, DOM, and CSS remain beside the active product.
- Existing checks cover syntax and selected contracts, not the complete workflow.

Sources: `PRODUCT.md`, `DESIGN.md`, `docs/codex-mvp-stabilization-report.md`, and
`docs/codex-mvp-reliability-pass-report.md`.

## In scope

- Isolate the active shell from obsolete legacy startup/render paths.
- Keep all eight active modules reachable.
- Add an automated smoke test for the core object lifecycle and state transitions.
- Verify desktop and mobile layout.

## Non-goals

- New modules or visual concepts.
- Apple Calendar integration.
- Rich-text notes, attachments, nested folders, or multi-user collaboration.
- A normalized-table migration in this stage.

## Product and data contract

- One module rail, contextual sidebar, workbench, and optional selected-object panel.
- Inspector space exists only for a selected object.
- Every primary visible action changes state, navigates, or opens an editable object.
- Existing local/cloud state continues to normalize without destructive migration.
- State changes continue through the existing save/sync boundary.

## Acceptance criteria

1. Only the active shell initializes on load.
2. All eight modules remain reachable.
3. A smoke test covers capture -> classified object -> task update -> scheduling/focus
   event -> completion -> audit log -> serialization/reload normalization.
4. Existing checks and the new smoke test pass.
5. Desktop and mobile have no horizontal page overflow.
6. No empty inspector width is reserved without a selected object.

## Verification

Run `node --check public/app.js`, `node --check public/sw.js`, `node --check server.js`,
`npm run check`, and `git diff --check`. Verify `/?fresh=<version>` at 1280 x 720 and
390 x 844. Record overflow, main width, inspector visibility, module navigation, and
console errors.

## Risks and rollback boundary

- The active shell may reuse legacy listeners; search event ownership before deletion.
- Preserve the current dirty worktree and all user-approved accumulated work.
- Limit this stage to startup/render isolation and workflow test coverage.

## Handoff prompt

Work in `/Users/maffaka/Documents/New project`. Read `AGENTS.md`, `PRODUCT.md`,
`DESIGN.md`, and `docs/stages/production-baseline.md`. Complete only this stage. Preserve
the dirty worktree. Isolate the active `simple-app` shell from legacy startup/render paths,
add the workflow smoke test, run all checks, verify desktop/mobile, bump asset and service
worker versions, and write `docs/codex-production-baseline-report.md`.
