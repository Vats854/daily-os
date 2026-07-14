# Production baseline report

## What changed

- Added the repository stage workflow at `.agents/skills/run-daily-os-stage/SKILL.md`.
- Added the production baseline brief under `docs/stages/` and linked the workflow from
  `AGENTS.md`.
- Explicitly quarantined the old dashboard shell as hidden, inert, and inaccessible while
  keeping its DOM temporarily available for listener compatibility.
- Added reliability contracts proving that `#simpleApp` is the only active shell and
  `render()` exits after rendering it.
- Expanded the pure state layer with inbox resolution, scheduling, focus-session,
  completion, and audit record helpers.
- Added a complete state smoke test: capture -> task -> schedule -> focus -> complete ->
  audit -> serialize/reload.
- Bumped active assets and the service-worker cache to `v125`.

## Why

The product had one visible shell but still shipped the complete previous dashboard DOM.
That made future changes harder to reason about and left the core daily workflow covered
only by separate feature checks. This stage establishes one explicit production surface
and a reusable acceptance path before further feature development.

## Files edited

- `AGENTS.md`
- `.agents/skills/run-daily-os-stage/SKILL.md`
- `docs/stages/production-baseline.md`
- `public/index.html`
- `public/styles.css`
- `public/sw.js`
- `public/task-state.js`
- `scripts/task-state-smoke.test.mjs`
- `scripts/reliability-check.mjs`
- `docs/codex-production-baseline-report.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

All passed. The test suite now contains three passing state tests, including the complete
daily workflow snapshot.

## Browser verification

URL: `http://127.0.0.1:4174/?fresh=125`

Desktop, `1280 x 720`:

- horizontal page overflow: false;
- legacy shell hidden: true;
- all eight modules opened successfully;
- console warnings/errors: none;
- selected Notes object kept a meaningful detail panel; the workbench width was `320px`.

Mobile, `390 x 844`:

- application width: `390px`;
- main workbench width: `390px`;
- horizontal page overflow: false;
- empty Log inspector visible: false;
- console warnings/errors: none.

## Remaining risks

- Legacy HTML and listeners still exist for compatibility. They are now inert, but a
  dedicated deletion pass should remove the obsolete renderers and CSS after confirming
  no active interaction imports them.
- The cloud document still uses last-write-wins at the object level despite revision
  detection. Conflict-safe per-object writes are the next storage foundation stage.
- The automated workflow test exercises the state contract, not real browser clicks or
  Supabase network persistence. A browser E2E test with isolated test data remains useful.

## Recommended next stage

`Cloud-safe daily use`: make object writes revision-aware, expose a calm conflict state,
and verify the same object edited from two sessions without silent data loss. Keep the
stage technical and do not combine it with new visual modules.
