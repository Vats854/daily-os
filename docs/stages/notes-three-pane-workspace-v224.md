# Notes three-pane workspace — v224

## Observable outcome

Notes uses the available desktop width as a stable three-zone workspace: global navigation, a compact note library, and a wide editor. Folder navigation no longer consumes a permanent fourth column.

## Verified current state

- The desktop Notes shell currently reserves four columns: icon rail, folder rail, note index, and editor.
- At laptop widths the note index and editor are both cramped even though the screen has enough total width.
- Folder selection and folder actions are implemented through `data-note-folder` and `data-note-folder-action` handlers.
- Note order is deterministic after v221.

## Scope

- Move folder filtering and folder management into the note library.
- Remove the permanent Notes folder rail from the rendered Notes navigation.
- Use a stable three-column desktop grid and give the editor all remaining width.
- Preserve note creation, selection, folder creation, rename, icon/tone changes, and deletion.
- Verify desktop and narrow viewport behavior in light and dark themes.

## Non-goals

- No new note features, editor capabilities, storage changes, or framework migration.
- No changes to Today, Calendar, Habits, or other modules.

## Product model

- Screen job: quickly choose a note and edit it.
- Primary object: note.
- Inspector: the editor is meaningful only for the selected note; otherwise it shows the existing empty state.

## Data and migration

No data contract or migration changes. Existing note and folder state is reused.

## Acceptance criteria

- At desktop widths Notes has exactly three persistent columns.
- The library is 340–420px wide and the editor receives the remaining width.
- Folder filters and all existing folder management actions remain usable inside the library.
- Page-level horizontal overflow is false.
- Selected note rows and editor content do not overlap or shift without user input.
- Required syntax and project checks pass.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser route: `http://127.0.0.1:4173/?fresh=224`
- Viewports: 1180×820, 1512×982, and 780×900.
- Record page overflow, library width, editor width, and editor visibility.

## Risks and rollback boundary

The main risk is duplicated or inaccessible folder controls. The change is isolated to Notes rendering and final Notes CSS overrides and can be rolled back without affecting stored data.

## Handoff prompt

Verify the Notes v224 three-pane workspace at desktop and narrow widths. Confirm folder selection and management, note selection, stable widths, no horizontal overflow, and both themes. Fix only regressions within Notes.
