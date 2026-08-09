# Today, Calendar, Habits visual stabilization v210

## What changed

- Mobile Habits inspector now keeps its existing close control fixed and visible in the top-right corner.
- Mobile appearance settings can open from the compact shell even though the desktop list rail stays hidden.
- Calendar tasks without a time now use a dedicated ellipsis container instead of clipping raw button text.
- Mobile Today signals a long focus with an ellipsis and keeps the collapsed evening review inside the viewport.
- Asset and service-worker versions were advanced from v209 to v210.

## Why

Browser verification found three concrete stabilization defects: the Habits close button overlapped its heading, the mobile theme menu was trapped inside a hidden rail, and Calendar/Today text could be clipped without a readable overflow treatment. No product behavior or data model was added.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `docs/codex-today-calendar-habits-visual-stabilization-v210-report.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- 13 task-state smoke tests passed.

## Browser verification

Verified at 1440×900 and 390×844 in light and dark modes across Today, Calendar, and Habits.

- Desktop page overflow: false.
- Desktop main panel: 1120 px without an inspector; Habits previously measured 722 px with a meaningful selected-habit inspector.
- Mobile page overflow: false.
- Today inspector: hidden with no selected object.
- Habits inspector: visible only for the selected habit; close control measured at x346/y16 in the 390 px viewport.
- Calendar workspace/grid fit on desktop: true/true.
- Calendar on mobile: the 760 px week canvas scrolls inside its workspace; the page itself does not overflow.
- Habit rows fit: true.
- Mobile Today evening review fit: true.

## Remaining risks

- The in-app browser produced one dark-mode screenshot with a pale sidebar overlay even though computed background, text, opacity, and filter values were correct; a repeated capture retained the artifact. No CSS was changed to compensate for an unverified capture-only condition.
- The mobile Calendar deliberately keeps its existing horizontally scrollable week canvas.
