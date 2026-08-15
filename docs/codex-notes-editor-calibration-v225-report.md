# Notes editor calibration v225 — report

## What changed

- Removed the blue active-row stripe that collided with note text.
- Increased list-row padding and normalized title, preview, folder, and date typography.
- Replaced the breadcrumb-like `Заметки / Личное` treatment with one compact `Список` control.
- Reduced the note title from the oversized 42px treatment to a 26–34px document heading.
- Removed the bordered editor-card appearance and aligned the title, toolbar, body, and tags on one document column.
- Normalized tag input typography and control sizing.
- Made the note action icon visible in dark mode.
- Bumped app assets and service-worker cache to v225.

## Why

The previous editor mixed list, card, breadcrumb, form, and document patterns. The selected row also used two competing active indicators. The revised view uses one standard document-editor pattern and one active state.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Browser verification

- Route: `http://127.0.0.1:4173/?fresh=225`
- Viewport: 1512×900, dark theme.
- Page overflow: false.
- Active row: 379px wide, 14px padding, decorative `::before` hidden.
- Editor: 860px wide with 56px desktop side padding.
- Note title: 34px maximum.
- Tags input: 13px with consistent application font.
- Note menu icon: visible through dark-theme filter.

## Remaining risk

Extremely long note titles still wrap to two lines; the editor caps their visual height to keep the toolbar stable.
