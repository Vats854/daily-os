# Task Options And Sound Report

## What changed

- Replaced the heavy task property grid with tracker-style option chips:
  - status;
  - area;
  - priority;
  - due presets;
  - estimate presets.
- Kept precise controls only where needed:
  - exact date input;
  - exact estimate input;
  - project/routine link select;
  - tags input.
- Added click handling for `data-task-option` buttons through the existing `updateTaskField()` path.
- Reworked generated focus sound buffers so categories have distinct sound profiles:
  - `Deep Work`: low tone + slow pulse;
  - `Calm Focus`: softer tone + breathing layer;
  - `Coding`: higher tone + subtle rhythmic ticks;
  - `Reading`: quiet low movement;
  - `Rain`: brighter noisy layer with drops;
  - `Brown Noise`: low filtered noise.
- Bumped app assets to `v77` and service worker cache to `second-brain-command-center-v77`.

## Why

Task metadata previously looked like a heavy admin form. In common task trackers, task properties are quick options or compact menus. This pass keeps the current data model but makes the inspector feel lighter and faster.

The sound categories previously used nearly the same generated buffer, so switching categories did not feel meaningful. The generator now uses different synthesis recipes per category.

## Files edited

- `public/app.js`
- `public/index.html`
- `public/styles.css`
- `public/sw.js`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`

## Remaining risk

- This is still generated audio, not curated music. It should feel distinct, but it will not match Brain.fm/Freedom-level sound design without real audio assets.
- Project/routine link is still a select because it can contain many dynamic objects.
