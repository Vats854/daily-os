# Stage: Dead code ownership cleanup

## User outcome

Daily OS keeps the same working task-core experience while shipping less retired
dashboard JavaScript and reducing the chance that future changes touch the wrong UI.

## Verified current state

- v138 ships one shell and one render path.
- Retired renderer functions remain interleaved with production helpers.
- Fourteen top-level functions have only their declaration as a source occurrence and are
  therefore unreachable from production or legacy wiring.

## Scope

- Remove only top-level functions with zero call/reference sites.
- Recompute references after deletion and remove newly orphaned renderer-only helpers in
  a second evidence-based batch if checks remain green.
- Keep shared task, project, calendar, habit, focus, auth, sync, and state helpers.
- Bump assets and verify all modules.

## Non-goals

- Rewrite `app.js` into modules.
- Remove CSS without selector usage evidence.
- Change UI or state behavior.

## Acceptance criteria

1. Production behavior and stored-state contract are unchanged.
2. Every deleted function has no call/reference site at the moment of deletion.
3. All reliability and state tests pass.
4. All eight modules open without horizontal overflow on desktop and mobile.

## Verification

- Required Node checks, `npm run check`, `git diff --check`
- Browser route `http://127.0.0.1:4173/?fresh=139`
- Desktop and 390x844 mobile module sweep

## Risks and rollback

Textual occurrence counts do not understand dynamic property lookup. Only named local
functions with no string-based dispatch contract are eligible. Each deletion batch is a
separate diff boundary and can be reverted without data migration.

## Handoff prompt

Create CSS selector ownership coverage for `styles.css` and remove retired dashboard-only
rules in small verified batches.
