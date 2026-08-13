# CSS shell consolidation v216

## Observable outcome

Today, Calendar, Habits, and Projects remain inside the visible viewport at desktop,
laptop, and mobile widths in both light and dark modes. Text wraps or truncates inside
its owning control; the page itself never becomes a horizontally scrolling canvas.

## Verified current state

- The active app is the vanilla `simple-app` shell from `public/index.html`.
- Shell columns are declared in both `public/styles.css` and several late sections of
  `public/task-core.css`.
- The last desktop detail layout has a hard minimum wider than common laptop/zoomed
  viewports (`64 + 280 + 520 + 340px`).
- Projects, Calendar, Habits, and Today each have later geometry overrides, so earlier
  responsive rules cannot reliably contain them.

## Scope and non-goals

Establish one final shell sizing and overflow contract; contain Projects forms and map,
keep Calendar's wide grid scrolling locally, and contain Today/Habits content. No new
features, data changes, navigation changes, redesign, framework migration, or deploy.

## Screen jobs and data

Today manages the accepted daily plan. Calendar manages time blocks and uses a
contextual block inspector. Habits is a tracker with an inspector only on selection.
Projects manages one long-running project on a wide canvas without a redundant
inspector. No data contract or migration changes are required.

## Acceptance criteria and verification

- At 1440x900, 1180x820, 980x760, and 390x844: `scrollWidth <= clientWidth` for the page.
- Main panel has positive width and no child crosses its right edge.
- Empty inspector is hidden; contextual inspector is inline only when it fits and
  overlays narrower desktop widths.
- Project surfaces fit; Calendar owns any necessary horizontal scroll.
- Light and dark modes remain readable.
- Run required syntax checks and `npm run check`.
- Browser route: `http://127.0.0.1:4173/?fresh=216`.

## Risks and rollback

Risk is cascade interaction with historical responsive layers. Roll back the final v216
consolidation block and asset/cache version bumps; no behavior or stored state changes.

## Handoff prompt

Verify v216 containment for Today, Calendar, Habits, and Projects in both themes. Report
page overflow, main width, inspector state, and key-surface fit. Fix only reproducible
containment regressions; do not add features or deploy.
