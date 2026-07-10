# App Toolbar Report

## What changed

- Moved `.topbar` out of `.workspace` so it becomes an app-level toolbar.
- Updated the shell grid to:
  - left icon rail;
  - top toolbar;
  - main workspace;
  - optional right inspector.
- Kept the toolbar sticky above both the workspace and inspector.
- Reduced toolbar height to `68px` and tightened title/subtitle typography.
- Bumped assets to `v76` and service worker cache to `second-brain-command-center-v76`.

## Why

The previous toolbar lived inside the content pane, so it felt like part of the page content rather than a system panel. Moving it to the shell level makes the app feel closer to a desktop task manager: navigation on the left, global controls on top, work surface below.

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

The CSS still contains historical shell overrides. This app-level toolbar is stabilized by the final `v76` layer, but a later cleanup should delete obsolete topbar/sidebar rules.
