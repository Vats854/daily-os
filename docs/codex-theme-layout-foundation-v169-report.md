# Theme and layout foundation v169

## What changed

- Replaced scattered light/dark overrides with semantic surface, control, hover, selected-state, text, border, and shadow tokens.
- Added coherent sky, sage, and clay selected states for both light and dark modes.
- Fixed dark-mode contrast for the appearance menu, editor outcomes, task controls, inputs, calendar headers, and events.
- Repositioned and widened the appearance menu so it opens beside the sidebar without covering its labels.
- Rebalanced the desktop shell: the main workspace now takes available width and the detail panel has a stable 420-560 px range.
- Made mobile detail panels full-screen above the bottom module rail.

## Why

The previous theme work changed colors without providing a consistent semantic hierarchy. As a result, controls inherited unrelated colors, selected buttons could become white-on-white, and overlays competed with navigation. This pass establishes one reusable visual contract before further screen-level redesign.

## Files edited

- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `docs/stages/theme-layout-foundation-v169.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`

All checks passed, including 13 state smoke tests.

## Browser verification

- URL: `http://127.0.0.1:4174/?fresh=169`
- Desktop viewport observed: 1280 x 720.
- Page overflow: false.
- Main panel width without detail: 984 px.
- Empty detail panel: hidden.
- Appearance menu: 304 x 528 px, no internal horizontal overflow.
- Dark appearance menu and expanded toggle use semantic surface/selected colors with readable text.
- Calendar dark-mode header and grid no longer fall back to white surfaces.

Local auth credentials are not available to the dev server, so signed-in Inbox/task editor states require final verification on the deployed authenticated build.

## Remaining risks

- Production authentication and Supabase state should be smoke-tested after deployment.
- Screen-specific typography and density can now be calibrated without adding another override layer.
- Browser viewport override was unavailable in the connected local browser session; mobile behavior is covered by CSS rules and automated checks but should receive a manual phone pass after deployment.
