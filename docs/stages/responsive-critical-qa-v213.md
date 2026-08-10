# Responsive critical QA v213

## Observable outcome

Daily OS keeps its navigation, primary workbench, controls, and readable text inside the
page at common desktop, zoom-equivalent, and mobile widths in both light and dark modes.

## Verified current state

- Production is on asset version 212.
- A local v213 fix prevents Projects from widening the document below 1180 CSS pixels.
- At 1024 px Projects uses a horizontal project index and has no page overflow.
- At 1440 px Projects keeps the two-column workbench and all forms fit.
- Existing unrelated user changes are present and remain outside this stage.

## In scope

- Deploy the already verified Projects v213 containment fix.
- Check Today, Calendar, Habits, Tasks, Notes, Projects, Focus, Inbox, and Log.
- Check light and dark modes at 1440, 1024, and 390 CSS pixels.
- Fix only page overflow, clipped text, broken grids, or inaccessible navigation.

## Non-goals

- No new features, information architecture, data model, or visual redesign.
- No cosmetic spacing polish that does not block reading or interaction.
- No cleanup of historical CSS outside selectors required by a reproduced defect.

## Primary objects and screen jobs

Each screen keeps its existing primary object: inbox item, task, daily plan, calendar
block, habit, focus session, note, project, or assistant action. Inspector behavior and
the established list/workbench pattern do not change.

## Data contract and migration

No state or schema changes. Only CSS containment and asset/cache versioning may change.

## Acceptance criteria

1. `documentElement.scrollWidth <= innerWidth` on every tested route and viewport.
2. Global navigation remains visible and usable.
3. Primary headings, object titles, forms, and action controls stay inside their region.
4. Dark and light themes preserve the same geometry.
5. All required checks and the 13 task-state smoke tests pass.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`
- Browser: `http://127.0.0.1:4174/?fresh=213` at 1440x900, 1024x800, and 390x844.
- Record page overflow, main width, navigation visibility, and failing object selectors.

## Risks and rollback boundary

Historical responsive rules can override fixes later in the cascade. Keep changes scoped
to the active `simple-app` and module selector. Roll back only v213 selectors and asset
version changes if a regression appears.

## Handoff prompt

Read `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, and this brief. Preserve unrelated changes.
Verify all active modules in both themes at 1440, 1024, and 390 CSS pixels. Fix only
critical containment, clipping, grid, and navigation defects; run required checks and
write the final report.
