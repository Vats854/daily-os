# Focus, Habits, Task Menu Update

## What changed

- Removed the small rituals teaser from `Today`.
- Kept habits as a separate surface and moved the nav item directly before `Log`.
- Added a separate `Focus` surface for task selection, pomodoro, sound category, play/pause, and volume.
- Added a compact row-level task menu with date, priority, move actions, tags, and start focus.
- Bumped app assets to `v81` and service worker cache to `second-brain-command-center-v81`.

## Why

Today should manage the accepted day plan, not duplicate the habit tracker. Focus music/timer also needed a visible home because keeping it only inside the inspector made it feel like the feature disappeared.

## Files edited

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/sw.js`

## Remaining risks

- The row-level task menu is still an MVP implementation, not a full TickTick clone.
- Focus sounds are still generated local audio, not real curated music loops.
