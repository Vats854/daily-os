# Stage: Today visual foundation and themes

## Observable outcome

Today reads as a compact task workspace instead of a wide form: capture stays primary,
task metadata is secondary, rows scan cleanly, and the interface works in light, dark,
or system appearance.

## Verified current state

- Today uses one large composer row followed by four equally prominent selects.
- Task title and metadata wrap into a tall two-line stack.
- The main list is capped at 920px while the surrounding canvas is much wider.
- Appearance stores one of three light palettes (`sage`, `sky`, `clay`) and a font.
- Existing task state, ordering, selection, and persistence already work and must remain.

## Scope

- Recompose the Today task canvas around a stable 860-960px reading column.
- Reduce capture metadata to a compact secondary toolbar.
- Make task rows denser without hiding title, due state, list, priority, or actions.
- Add `system`, `light`, and `dark` color modes.
- Keep a small accent choice: blue, green, or amber.
- Persist appearance through the existing JSON state and sync path.

## Non-goals

- No task data migration beyond appearance defaults.
- No new task behavior, routes, backend tables, or framework.
- No redesign of Calendar, Projects, Notes, or Habits in this stage.

## Screen contract

- Primary object: task.
- Screen job: capture and scan work accepted for Today.
- Inspector: absent until a task is selected; selected task uses the existing detail pane.

## Data contract

- `settings.appearanceMode`: `system | light | dark` (new, default `system`).
- `settings.appearanceTheme`: `sky | sage | clay` (existing, preserved).
- Old states without `appearanceMode` normalize safely to `system`.

## Acceptance criteria

- The two Today tasks shown in seed data fit in stable rows without metadata stacking.
- Composer metadata is visibly subordinate to the task title field.
- Dark mode has legible canvas, sidebar, rows, menus, inputs, and detail surfaces.
- System mode follows `prefers-color-scheme` without reloading.
- No horizontal page overflow at 1440x900 or 390x844.
- Existing task add, toggle, selection, ordering, and persistence behavior remains.

## Verification

- Route: `http://127.0.0.1:4174/?fresh=160`
- Viewports: 1440x900 and 390x844.
- Measure page overflow, main panel width, detail visibility, row height, and composer fit.
- Run the repository syntax and reliability checks from `AGENTS.md`.

## Risks and rollback boundary

- Broad dark-theme selectors can expose hard-coded light surfaces outside Today. Keep
  overrides token-driven and verify the shell plus selected task detail.
- Rollback is limited to appearance state, Today CSS, menu markup, and cache version.

## Handoff prompt

Verify Today in system/light/dark modes on desktop and mobile. Confirm task capture,
selection, and persistence. Fix only visible contrast, overflow, or density regressions;
do not expand the stage into other modules.
