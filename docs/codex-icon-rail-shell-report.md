# Icon Rail Shell Fix

## What changed

- Replaced the top-tab feeling with a narrow left icon rail.
- Forced a single desktop shell: `64px nav | content | inspector`.
- Removed the Inbox operator duplicate panel from the main canvas.
- Tightened topbar actions so search/sync/logout/primary action no longer stretch across the whole screen.
- Bumped app assets to `v72`.

## Why

The previous implementation added working task/focus mechanics but kept the old visual shell, so the app still felt like patched UI. Older CSS layers also conflicted with each other by hiding/showing inspector and changing grid columns per screen.

## Files edited

- `public/index.html`
- `public/styles.css`
- `public/sw.js`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`

## Browser verification

Not rerun with screenshot in this pass because the local Playwright Chromium binary is unavailable in this environment. The change is CSS/HTML shell-level and should be verified visually after deploy with hard refresh.

## Remaining risks

- This is still CSS override cleanup, not a full deletion of old shell layers. A later cleanup pass should remove obsolete v50-v61 layout rules instead of overriding them.
