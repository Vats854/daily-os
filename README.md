# Second Brain Command Center

PWA-first second brain MVP for daily planning, weekly planning, a lightweight task board, and an autonomous AI inbox.

The first version is intentionally narrow: the interface is a command center for today and this week, while deeper memory lives behind the assistant. It is not a full life database and it is not Telegram-first.

## MVP Scope

- PWA that works on phone and laptop.
- Today dashboard with focus, 3-5 key tasks, quick state, read-only calendar load, and AI inbox.
- Evening review that summarizes the day, moves carry-over work, and saves memory signals.
- Week dashboard with weekly focuses, progress, carry-over tasks, and load overview.
- Lightweight task board: Inbox, Backlog, This week, Today, Done.
- Three visible areas: work, personal, health.
- AI inbox that classifies raw text into tasks, notes, health signals, plan changes, and memory.
- Assistant audit trail for autonomous changes and `needs_review` flags.
- Read-only calendar policy for MVP.

## Current Prototype

This repo contains a dependency-free PWA prototype with local demo state.

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

The prototype implements the main product surface and client-side assistant heuristics. The production backend should move the same domain model to API + Postgres.

## Target Stack

- PWA frontend with responsive mobile-first layout.
- API service for app state, assistant actions, background jobs, and calendar reads.
- Postgres as the source of truth.
- Background worker for morning planning, evening review, weekly review, and inbox processing.
- LLM provider abstraction for assistant classification, planning, and summaries.
- Calendar integration in read-only mode for MVP.

## Docs

- [MVP specification](docs/mvp.md)
- [Data model](docs/data-model.md)
- [API sketch](docs/api.md)
- [Personal Passport methodology](docs/personal-passport-methodology.md)
- [Deployment sketch](docs/deployment.md)
