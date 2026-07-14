# Task detail and Inbox routing hotfix

## What changed

- Fixed the authenticated shell grid specificity so selected task details render in the right inspector instead of an implicit row below the app.
- Applied the same grid fix to the Notes workspace, restoring the full note editor when a note is selected.
- Removed the hidden fallback that assigned every task created from the system Inbox to the first custom list.
- Added conservative title-based initial routing for obvious health, learning, and work tasks; everything else defaults to the personal list.
- Bumped production assets and service worker cache to `v130`.

## Why

The task row selection already worked, but the authenticated three-column shell overrode the four-column detail layout. This made the inspector appear off-canvas below the main shell and made task clicks and ellipsis actions look inactive. The Inbox composer also used the first custom list as a fallback, which silently routed unrelated tasks to `карьера`.

## Files edited

- `public/app.js`
- `public/index.html`
- `public/sw.js`
- `public/task-core.css`
- `scripts/reliability-check.mjs`

## Checks run

- `npm run check`
- `git diff --check`

All checks passed, including five state persistence smoke tests.

## Browser verification

The release is prepared as `v130`. Production verification should confirm:

- page overflow: false;
- task inspector: visible on the right after one row click;
- task menu: visible after the ellipsis click;
- note editor: visible in the main document pane after note selection;
- Inbox task `сходить в зал`: list `здоровье`, when that list exists.

## Remaining risks

- Existing tasks keep their current list intentionally; the fix affects new Inbox tasks only.
- Automatic initial routing is intentionally conservative and does not replace explicit list selection.
