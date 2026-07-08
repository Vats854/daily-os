# Interface Architecture Reset

## Product Job

Second Brain is an operational tracker with an AI operator. It is not a life dashboard.

The interface should help the user decide what to do, what to keep, what to defer, and what the assistant changed or challenged.

## Current Problems

- The app mixes operational surfaces with dashboard diagnostics.
- The right rail repeats categories, rituals, calendar, and journey on every screen even when they are not relevant.
- `Overview` is too broad: metrics, areas, habits, insights, project journey, and project detail compete for attention.
- `Week` drifted into fake analytics. It should show committed weekly work, not invented load.
- `Today` is the closest useful screen, but still has too many global metrics above the work.
- Hero Journey is useful, but should live in Projects, not be repeated everywhere.
- Habits are useful, but should be a compact Today/Review element, not a permanent dashboard rail.

## Target Information Architecture

### 1. Inbox

Primary object: incoming item.

Purpose: capture thoughts, tasks, notes, health signals, project ideas, and context.

Must show:
- input composer;
- unprocessed inbox items;
- assistant interpretation;
- proposed actions;
- `needs_review` queue.

Do not show dashboards here.

### 2. Today

Primary object: daily plan.

Purpose: open the app and understand what to do now.

Must show:
- focus of the day;
- tasks committed to today;
- small habit checklist;
- read-only calendar context;
- assistant suggestions for the day.

Remove:
- global project journey;
- large metrics;
- decorative progress unless tied to task completion.

### 3. Week

Primary object: weekly commitment.

Purpose: choose what belongs in the week and what does not.

Must show:
- weekly focuses;
- tasks in `this_week`;
- carry-over/backlog candidates;
- assistant review/challenge.

Do not show:
- fake load;
- percentages not backed by real scheduling;
- day-by-day plan until tasks have due dates or explicit scheduled slots.

### 4. Projects

Primary object: project.

Purpose: manage goals, milestones, blockers, and Hero Journey stage.

Must show:
- project list;
- selected project detail;
- linked tasks and notes;
- blockers;
- journey stage;
- proposed transitions requiring confirmation.

Hero Journey belongs here first.

### 5. Board

Primary object: task.

Purpose: move tasks through status.

Columns:
- Inbox;
- Backlog;
- This week;
- Today;
- Done.

Keep this plain and dense.

### 6. Assistant Log

Primary object: assistant action.

Purpose: audit what AI understood and changed.

Must show:
- source input;
- interpretation;
- changed objects;
- reason;
- status: `applied`, `needs_review`, `needs_confirmation`, `rejected`.

## Navigation

Recommended desktop nav:

1. Inbox
2. Today
3. Week
4. Projects
5. Board
6. Log

Mobile / Telegram Mini App should prioritize:

1. Today
2. Inbox
3. Tasks
4. Review

## Layout Rules

Use a standard productivity layout:

- left sidebar: navigation only;
- main pane: one primary object;
- right inspector: selected object details or assistant actions only;
- no permanent right rail with unrelated context;
- no global summary strip on every screen unless it changes the current decision.

## What To Remove From Current UI

- Permanent `daily-strip` across all views.
- Permanent `context-rail` as a global rail.
- `Overview` as a catch-all dashboard.
- Fake weekly load and similar invented metrics.
- Repeated journey snippets outside Projects.
- Large cards that do not contain editable objects.

## What To Keep

- Task statuses and board.
- AI inbox/action trail model.
- Daily focus.
- Weekly focuses.
- Rituals as compact checklist.
- Calendar as read-only context.
- Hero Journey as project diagnostic.

## First Implementation Pass

1. Add `Inbox`, `Projects`, and `Log` nav items.
2. Remove `Overview` from primary nav or demote it to `Review`.
3. Replace global right rail with screen-specific inspector.
4. Simplify `Week` to focuses + this-week tasks + carry-over.
5. Move Hero Journey UI into `Projects`.
6. Move assistant feed/action audit into `Log` and local inspectors.

## Quality Gate

Before adding any block, answer:

- What object does this manage?
- What decision does it help make?
- What can the user edit or confirm?
- What data backs it?
- Would this still make sense as a plain table?

If any answer is weak, do not add the block.
