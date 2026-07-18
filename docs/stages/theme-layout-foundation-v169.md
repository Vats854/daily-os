# Theme and layout foundation v169

## Observable outcome

Daily OS has one coherent visual foundation across light and dark modes: navigation,
task surfaces, drawers, calendar, menus, and selected states keep the same geometry,
remain readable, and never hide controls through low contrast or overlap.

## Verified current state

- The production shell already supports system/light/dark modes, three accents, and
  three font presets.
- Theme rules are concentrated in `public/task-core.css`, but dark-mode exceptions are
  duplicated and some components still use component-specific colors.
- The appearance panel, capture drawer, selected navigation rows, calendar headers,
  and compact action buttons are the highest-risk surfaces seen in current screenshots.
- Application state and persistence already work; this stage must not change their data
  contract.

## Scope

- Consolidate semantic color tokens for canvas, rails, surfaces, controls, selection,
  text, muted text, borders, danger, and focus.
- Normalize typography, spacing, control heights, hover/focus/selected states.
- Fix appearance menu anchoring and drawer/header geometry.
- Make light and dark modes share component geometry.
- Harden desktop and mobile layouts against overlap and horizontal page overflow.
- Verify Today, Inbox/capture, Notes/detail, Calendar, and the appearance menu.

## Non-goals

- No new features, navigation destinations, database fields, or AI behavior.
- No framework migration or new build tooling.
- No rework of calendar interaction logic, task semantics, or note hierarchy.
- No decorative dashboard widgets or new visual metaphor.

## Product model

- Primary object remains screen-specific: task on Tasks/Today, raw item in Inbox, note
  in Notes, calendar block in Calendar.
- The right drawer appears only for a selected editable object and must have an
  independent close action.
- The appearance menu is a compact anchored popover, not a third permanent rail.

## Data contract

No migration. Preserve `settings.appearanceMode`, `settings.appearanceTheme`, and
`settings.appearanceFont`. Preserve all task, note, inbox, and calendar state.

## Acceptance criteria

1. Light and dark modes expose every visible control with WCAG-minded contrast; no
   white text on pale selected surfaces and no dark glyph hidden on dark buttons.
2. Opening appearance settings or an object drawer does not cover its close button,
   clip labels, or shift unrelated columns.
3. Today, Inbox, Notes, and Calendar have no document-level horizontal overflow at
   1440x900 and 390x844.
4. Desktop main content uses the available width while keeping readable line lengths;
   drawers are 420-560px and do not reduce the primary list below a useful width.
5. Navigation, task selection, theme switching, and drawer close controls remain
   functional in both themes.
6. Asset versions and service-worker cache are bumped together.

## Verification

Commands:

```bash
node --check public/app.js
node --check public/sw.js
node --check server.js
npm run check
```

Routes:

- `http://127.0.0.1:4174/?fresh=169`
- `https://daily-os-mu.vercel.app/?fresh=169` after deployment

Viewports and evidence:

- 1440x900: Today, Inbox drawer, Notes detail, Calendar, appearance menu in light/dark.
- 390x844: Today and Inbox drawer in light/dark.
- Record page overflow, main panel width, drawer visibility/width, and menu bounds.

## Risks and rollback

- Risk: broad token changes can expose old selectors with hard-coded colors.
- Risk: cached CSS can make verification appear stale.
- Rollback boundary: `public/task-core.css`, asset query versions in
  `public/index.html`, and `CACHE_NAME` in `public/sw.js`.

## Handoff prompt

Implement the v169 theme/layout foundation from this brief. Preserve data and behavior,
replace component-specific theme exceptions with semantic tokens where possible, verify
the named screens in both modes, and stop after checks, screenshots, measurements, and
the implementation report are complete.
