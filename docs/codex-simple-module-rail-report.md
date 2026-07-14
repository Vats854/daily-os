# Simple Module Rail Fix

## What changed

- Replaced duplicated left navigation with a proper module rail:
  - Tasks
  - Habits
  - Focus
  - Notes
  - Projects
  - Log
- The second rail now changes by selected module instead of repeating the same top-level sections.
- Tasks module keeps TickTick-like inner navigation: Today, Next 7 days, Inbox, All tasks, then lists.
- Habits, Focus, Notes, Projects, and Log no longer appear as task-list siblings.
- Added `state.ui.simpleModule` normalization so older saved state falls back to `tasks`.
- Bumped app assets to `v85` and service worker cache to `second-brain-command-center-v85`.

## Why

The previous shell had two competing navigation layers. That made the UI feel duplicated and unlike a normal task tracker: the left icon rail and list rail both represented sections. The new model separates module switching from lists inside a module.

## Files edited

- `public/index.html`
- `public/app.js`
- `public/sw.js`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `npm run dev` started successfully at `http://127.0.0.1:4174`, then stopped.

## Browser verification

Automatic local `curl` from the sandbox could not reach the elevated dev-server process, so the visual check should be done manually at `http://127.0.0.1:4174/?fresh=85` or the deployed Vercel URL after push/redeploy.

## Remaining risk

This fixes the navigation structure, but the individual module screens still need cleanup: board interactions, inbox result visibility, note routing, and the focus/sound panel need separate functional passes.
