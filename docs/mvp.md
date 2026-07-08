# MVP Specification

## Product Idea

The assistant is a PWA-first planning system. The app is the daily command center, Postgres is the source of truth, and the assistant is an autonomous operator that keeps the day, week, board, and memory clean.

The assistant should help with:

- Opening the app in the morning and immediately understanding what matters today.
- Keeping the visible interface focused on day, week, tasks, and project direction.
- Capturing raw thoughts through an AI inbox inside the app.
- Turning raw input into tasks, notes, health signals, plan changes, and durable memory.
- Moving work between Inbox, Backlog, This week, Today, and Done.
- Reading calendar load without writing events in the MVP.
- Summarizing the day and recalibrating tomorrow.
- Keeping personal operating rules available for planning without showing a huge life database.

## Core User Flows

### Morning Command Center

The user opens the PWA from phone or laptop and sees:

- daily focus;
- 3-5 key tasks;
- day progress;
- quick status: steady, low energy, overloaded;
- read-only calendar events;
- recent assistant actions.

Assistant behavior:

- If there are fewer than 3 useful Today tasks, promote important tasks from This week or Backlog.
- If the day is overloaded, move low-priority work out of Today.
- Preserve calendar events as read-only constraints.
- Record every autonomous change in `assistant_actions`.

### AI Inbox Capture

User example:

```text
надо сегодня проверить первый экран на телефоне и не забыть, что после созвонов мало энергии
```

Assistant behavior:

- Detect task-like, note-like, health, and planning signals.
- Create or update tasks when the intent is operational.
- Save notes and memory items when the input is contextual.
- Mark uncertain or vague changes as `needs_review`.
- Keep an audit trail of what changed and why.

### Week Review

The week screen should show:

- weekly focuses;
- rough progress;
- carry-over tasks;
- workload by day;
- a command to promote relevant Backlog items into This week.

### Project Journey Review

Large goals and projects use a practical seven-stage path:

- `call` - idea and why.
- `commitment` - accept, postpone, or reject.
- `preparation` - resources, plan, limits.
- `trial` - regular work and first friction.
- `crisis` - stuck point, resistance, overload, or blocker.
- `result` - deliverable or completed stage.
- `integration` - lessons and next cycle.

Assistant behavior:

- Evaluate stage from related tasks, reviews, obstacles, energy, and memory.
- Create proposed stage transitions with `needs_confirmation`.
- Use the journey as an argument when challenging new projects or premature abandonment.
- Show only actionable journey signals in Overview, not a separate gamification dashboard.

### Board Management

The board uses five statuses only:

- `inbox`
- `backlog`
- `this_week`
- `today`
- `done`

The assistant may move tasks between these statuses when it reduces overload or makes the plan clearer.

### Evening Review

The assistant should collect:

- what was completed;
- what moved;
- whether the plan was realistic;
- what tomorrow should inherit;
- any energy or mood pattern worth saving.

It should update daily review fields, carry unfinished work forward, and create memory items for repeated patterns.

The prototype implements this as a `Today` panel: the user writes a short free-form review, the assistant summarizes the day, updates task statuses, moves unfinished work to the week, and stores energy signals as memory.

## PWA Navigation

- `Today` - focus, key tasks, AI inbox, quick state, read-only calendar, assistant feed.
- `Week` - weekly focuses, load, carry-over tasks.
- `Board` - lightweight kanban.

## Assistant Responsibilities

The LLM should not be the database. It receives compact structured context and returns structured decisions.

Use the LLM for:

- Intent classification.
- Extracting tasks, notes, health signals, plan changes, dates, priorities, and areas.
- Drafting morning and evening summaries.
- Suggesting focus and priority changes.
- Extracting memory items such as planning preferences, energy constraints, repeated misses, and decision rules.

Avoid using the LLM for:

- Calendar conflict calculation.
- Persistent storage.
- Authorization and security decisions.
- Silent calendar writes.

## Calendar Policy

Calendar integration is read-only in MVP.

Rules:

- Import external events as constraints.
- Display meetings, routines, and fixed blocks in Today.
- Do not create, update, or delete external calendar events.
- Do not use calendar as the task source of truth.

## MVP Non-Goals

- Multi-user SaaS.
- Native iOS/macOS apps.
- Telegram-first interface.
- Calendar write sync.
- Full Personal Passport UI.
- Complex project management or Jira-like workflows.
- Deep analytics dashboards.
