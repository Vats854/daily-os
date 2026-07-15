# Habit schedule editor

## Observable outcome

The user can open a habit, change its title, list, time-of-day group and active weekdays,
or archive it. The tracker shows only habits scheduled for the current day and keeps the
seven-day completion history visible.

## Verified current state

- Habits are a separate module with daily completion, seven dots and a streak.
- Creation works, but editing is limited to an always-visible group select.
- There is no schedule or archive contract, so every habit appears every day forever.

## Scope and non-goals

Add normalized `weekdays` and `archived` fields, a selected-habit inspector, weekday
scheduling and archive/restore. Keep completions intact. No reminders, custom intervals,
monthly rules, analytics, or habit widgets inside Today.

## Primary object and screen job

Primary object: habit. Habits remains a compact daily tracker; the inspector appears only
for a selected habit and owns secondary configuration.

## Data contract

- `habit.weekdays`: unique integers `0..6`; defaults to every day.
- `habit.archived`: boolean; defaults to `false`.
- Existing completion maps and streak values are preserved.

## Acceptance criteria

- Clicking a habit opens one editor without duplicating the tracker.
- Title, list, group and weekdays survive reload.
- Habits excluded from today do not appear in the active tracker.
- Archive removes a habit; restore is available from a compact archive section.
- Desktop and 390 px mobile have no horizontal page overflow.

## Verification and rollback

Run repository checks and browser-test `/?fresh=136`. Measure overflow, main width and
detail visibility. Rollback is limited to habit normalization, renderer, handlers and CSS.

## Handoff prompt

Continue from this brief and its report; implement the smallest remaining habit usability
gap without moving habits into Today.
