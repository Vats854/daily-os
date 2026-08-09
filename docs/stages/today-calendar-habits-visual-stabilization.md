# Today, Calendar, Habits visual stabilization

## Outcome

Bring Today, Calendar, and Habits to one calm, readable visual system in light and dark themes without changing product behavior.

## Scope

- Today: restore readable task titles, hierarchy, spacing, and empty states.
- Calendar: align the header, all-day row, date columns, and typography.
- Habits: remove oversized rows and clipping; keep the seven-day rhythm readable.
- Shared tokens: neutral surfaces, blue accent, consistent text contrast and type scale.

## Non-goals

- No new features or data model changes.
- No work on Inbox, Notes, Projects, Week, Focus, or Kanban.
- No deployment.
- No broad architecture rewrite.

## Acceptance criteria

- Task and habit titles do not truncate while useful width remains.
- No overlapping text or controls at desktop and mobile widths.
- Calendar header and all-day items stay inside their assigned tracks.
- Light and dark themes keep readable contrast without green as a primary accent.
- No horizontal page overflow.
- Existing interactions continue to work.

## Stop condition

At most three implementation-verification cycles. If a remaining issue cannot be fixed inside this scope, record it in the report and stop instead of expanding the task.

