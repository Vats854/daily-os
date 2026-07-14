# Habits Separate View Report

## What changed

- Added a separate `Habits` view in the left rail.
- Moved the full habit tracker out of Today:
  - habit groups;
  - today checkbox;
  - 7-day dots;
  - streak;
  - `+ habit` composer.
- Replaced the large Today habits block with a compact summary button:
  - completed/total count;
  - opens the Habits view.
- Updated view metadata:
  - title;
  - subtitle;
  - primary action label.
- Habits view hides the task inspector so old selected tasks do not leak into the habit tracker.
- Bumped assets to `v79` and service worker cache to `second-brain-command-center-v79`.

## Why

Habits and tasks are different primary objects. Keeping the full habit tracker inside Today made the daily plan feel like a mixed dashboard again. Today should answer what to do now; Habits should be a separate tracker surface.

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

- The Habits view uses the current habit data model only. A later pass can add recurring schedules, habit archive, reorder, and detailed habit settings.
