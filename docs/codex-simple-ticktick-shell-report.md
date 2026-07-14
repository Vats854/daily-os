# Simple TickTick-like Shell Update

## What changed

- Added a new simplified app shell above the previous complex interface.
- The old `app-shell` is visually disabled for signed-in/local users, but remains in the DOM as fallback.
- New shell structure:
  - left icon rail;
  - list rail with Today, Next 7 Days, Inbox, All Tasks, Notes, Habits, Focus;
  - area lists;
  - central clean list;
  - right details pane for selected task or note.
- Composer behavior is now predictable:
  - in task views it adds a task;
  - in Notes it adds a note;
  - in Inbox it uses inbox processing.
- Task details now expose date, priority, list, status, tags, and focus action in one simple pane.
- Note details can be edited in the right pane.
- Bumped assets to `v84` and service worker cache to `second-brain-command-center-v84`.

## Why

The previous architecture made the user fight the product. This slice steps back to a normal task-tracker structure before reintroducing assistant automation.

## Files edited

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/sw.js`

## Remaining risks

- The legacy shell still exists under the simplified shell and should be deleted or migrated later.
- The simplified shell is intentionally plain; visual refinement should happen only after the core workflow feels usable.
