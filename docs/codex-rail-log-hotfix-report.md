# Rail And Log Hotfix Report

## What changed

- Bumped app assets to `v75`.
- Defined `--font-ui` explicitly.
- Fixed the icon rail:
  - hidden noisy brand mark from the rail;
  - forced nav buttons into fixed icon cells;
  - restored visible nav icon typography;
  - removed the misleading active blue square behavior.
- Tightened the Log screen:
  - constrained the active Log surface width;
  - made audit rows more table-like;
  - reduced the feeling of a huge empty canvas.

## Why

The `v74` shell reset used `font: ... var(--font-ui)` while `--font-ui` was not defined. That invalidated the icon typography rule, so nav icons inherited `font-size: 0` from the hidden-label button style. The result looked like empty navigation cells and a random blue brand square.

## Files edited

- `public/index.html`
- `public/styles.css`
- `public/sw.js`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`

## Remaining risk

The stylesheet still has historical override layers. This hotfix stabilizes the visible shell, but the longer-term cleanup should delete old shell blocks instead of relying on later overrides.
