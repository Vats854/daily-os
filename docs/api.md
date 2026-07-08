# API Sketch

The MVP frontend currently runs with local demo state. The production API should keep the same domain shape and move persistence to Postgres.

## Core Endpoints

- `GET /api/health` - service health.
- `POST /api/career/cv-check` - analyze pasted resume text and return score, summary, and criteria.
- `POST /api/career/resume-match` - compare pasted resume and vacancy text.
- `POST /api/career/resume-tailor` - suggest fact-safe resume edits for a vacancy.
- `POST /api/career/cover-letter` - generate a short cover letter from resume and vacancy text.
- `GET /api/today` - daily plan, top tasks, read-only calendar events, recent assistant actions.
- `PATCH /api/today` - update focus, energy, or status.
- `GET /api/week` - weekly plan, focus list, progress, carry-over tasks.
- `POST /api/inbox` - accept raw text and let the assistant classify and apply changes.
- `POST /api/reviews/daily` - accept evening review text, summarize the day, move carry-over work, and save memory signals.
- `GET /api/tasks` - list board tasks.
- `POST /api/tasks` - create a task manually.
- `PATCH /api/tasks/:id` - change status, priority, area, estimate, or review flag.
- `GET /api/projects/:id/journey` - return current stage, timeline, obstacles, related tasks, and proposed transitions.
- `POST /api/projects/:id/journey/review` - run assistant journey review and create a proposed transition if needed.
- `POST /api/projects/:id/journey/transition` - user proposes a manual stage transition.
- `POST /api/projects/:id/journey/confirm` - confirm or reject an assistant-proposed transition.
- `GET /api/assistant-actions` - audit trail for autonomous changes.

## Assistant Contract

Career endpoints accept JSON:

```json
{
  "cvText": "resume text",
  "jobText": "vacancy text"
}
```

`cv-check` only requires `cvText`; the other career endpoints require both fields. If `OPENAI_API_KEY` is present, the server uses the OpenAI Responses API with a strict JSON schema. Without the key, it returns a local heuristic result with `provider = local`, so the UI can be tested without paid API calls.

`POST /api/inbox` accepts:

```json
{
  "text": "надо сегодня проверить первый экран на телефоне"
}
```

It returns:

```json
{
  "inboxItem": {
    "id": "uuid",
    "parsedKind": "task",
    "status": "processed"
  },
  "actions": [
    {
      "actionType": "create_task",
      "targetType": "task",
      "summary": "Created a Today task",
      "status": "confirmed"
    }
  ],
  "snapshot": {
    "todayScore": 40,
    "weekScore": 22
  }
}
```

## Autonomy Boundary

The assistant may create tasks, notes, memory items, change task status, move items between `backlog`, `this_week`, and `today`, and mark uncertain changes as `needs_review`.

The assistant must not write calendar events in the MVP. Calendar integration is read-only.

## Project Journey Contract

Projects use seven practical stages:

```text
call -> commitment -> preparation -> trial -> crisis -> result -> integration
```

The assistant may propose a transition during `journey_review`, but it must not apply it directly. Proposed transitions are stored as `project_stage_events.status = needs_confirmation`.

`POST /api/projects/:id/journey/review` returns:

```json
{
  "projectId": "uuid",
  "currentStage": "trial",
  "proposedStage": "crisis",
  "reason": "Open tasks and unresolved blockers indicate the project is stuck.",
  "eventStatus": "needs_confirmation"
}
```

`POST /api/projects/:id/journey/confirm` accepts:

```json
{
  "eventId": "uuid",
  "decision": "confirmed"
}
```

## Daily Review Contract

`POST /api/reviews/daily` accepts:

```json
{
  "text": "закрыл главный экран, но не успел доску; энергии мало, перенести хвосты на завтра"
}
```

It returns:

```json
{
  "review": {
    "id": "uuid",
    "date": "2026-06-24",
    "summary": "Закрыто: 1. Перенесено: 2. Энергия: low.",
    "tomorrowInherits": ["Доработать доску"]
  },
  "actions": [
    {
      "actionType": "move_carry_over",
      "targetType": "task",
      "status": "confirmed"
    }
  ]
}
```
