# Stage: Legacy dashboard removal

## User outcome

Daily OS ships only the task-core application markup and follows one render path.

## Verified current state

- v137 has one live shell, but 300 lines of retired dashboard HTML remain in an inert template.
- `render()` still contains an unreachable fallback that renders the retired dashboard.
- Retired renderer functions are interleaved with shared helpers, so bulk deletion without
  coverage mapping would create unnecessary regression risk.

## Scope

- Delete the archived dashboard markup from `index.html`.
- Reduce `render()` to the production `renderSimpleApp()` path.
- Update reliability contracts and asset versions.
- Verify every production module on desktop and mobile.

## Non-goals

- Delete interleaved legacy render helpers or legacy CSS without usage evidence.
- Change product behavior, persistence, or visual design.

## Contract and migration

No data migration. Task core remains the only shell and render owner.

## Acceptance criteria

1. `index.html` contains no legacy dashboard archive or legacy view IDs.
2. `render()` has one production path.
3. All eight modules open with no overflow on desktop and mobile.
4. Syntax, reliability, and task-state tests pass.

## Verification

- Required Node checks and `npm run check`
- Browser route `http://127.0.0.1:4173/?fresh=138`
- 1440x900 and 390x844 measurements

## Risks and rollback

The archived markup is inert and has no runtime state. Rollback is limited to restoring
the template and v137 render contract.

## Handoff prompt

Instrument production usage and delete legacy-only renderers and CSS in ownership-based
batches while preserving all task-core contracts.
