# Keyboard Shortcuts Settings

## Outcome

The user can see, change, reset, and immediately use the main Daily OS keyboard shortcuts without leaving the compact settings menu.

## Current State

- Search is hardcoded to `/` and `Cmd/Ctrl+K`.
- Escape closes transient UI.
- Appearance settings already live in the account overflow menu.
- User settings are persisted inside the shared Daily OS state.

## Scope

- Add six configurable commands: search, new item, Today, Calendar, Notes, Focus.
- Record one keyboard combination after the user selects a command.
- Reject duplicate combinations and reserved navigation keys.
- Persist shortcuts with the existing local/cloud state.
- Keep Escape as a fixed safety command.

## Non-goals

- Multi-key sequences such as `G` then `T`.
- OS-global shortcuts while the PWA is not focused.
- Rebinding browser or operating-system commands.

## Acceptance Criteria

- Settings show every command and its current combination.
- Clicking a command enters recording mode; the next valid key combination replaces it.
- Conflicting combinations show an inline error and do not overwrite either command.
- Reset restores defaults.
- Shortcuts do not fire while typing in an input, except the search combination.
- Existing state loads safely when no shortcut settings are present.

## Verification

- Run repository checks and task-state tests.
- Verify settings, recording, conflict handling, navigation, and composer focus in desktop browser.
- Verify the settings popover fits a 390px mobile viewport without horizontal overflow.

## Rollback Boundary

The feature is isolated to `settings.shortcuts`, the account settings popover, and the global keydown dispatcher.
