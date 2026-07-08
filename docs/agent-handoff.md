# Agent Handoff: Second Brain / Daily OS

## One-Line Summary

This project is a PWA-first Second Brain / Daily OS: an operational productivity tracker with an AI operator, not a generic life dashboard and not a Telegram-first chatbot.

The core product promise is:

> I open the app and understand what matters, what is committed, what needs review, and what the assistant changed or challenged.

## Current Date / Context

- Current date in thread: 2026-07-01.
- User timezone: Europe/Moscow.
- Workspace: `/Users/maffaka/Documents/New project`.
- Local app URL: `http://127.0.0.1:4173/?fresh=23`.
- Start command:

```bash
npm run dev
```

## Current Technical State

The repo currently contains a dependency-free vanilla PWA prototype:

- `server.js`: tiny Node HTTP server, local static app, `/api/health`.
- `public/index.html`: app shell and screens.
- `public/styles.css`: current design system and layout.
- `public/app.js`: localStorage state, rendering, demo assistant heuristics.
- `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`: PWA basics.
- `db/schema.sql`: Postgres-oriented target schema.
- `docs/*.md`: product, API, data model, deployment, IA reset.

There is no real backend yet, no Postgres runtime, no auth, no real LLM integration. State is localStorage demo data.

## Latest Implemented Version

Latest cache/version markers are `v23` in:

- `public/index.html`
- `public/sw.js`

Recent `v23` changes:

- Button renamed from `Автопилот` to `Проверить план`.
- Log screen changed toward compact grouped audit trail.
- Assistant actions are grouped in UI by identical title/reason/status with `xN`.
- Repeated “Автопилот прошёлся по системе” entries now render as grouped items.
- New click action now logs `План проверен`.

## Current Navigation / Surfaces

The architecture was reset from dashboard to operational surfaces:

1. `Inbox`
2. `Сегодня`
3. `Неделя`
4. `Проекты`
5. `Доска`
6. `Лог`

Old global dashboard pieces were removed:

- global `daily-strip`;
- permanent right `context-rail`;
- primary `Overview`;
- fake `load`/workload widget.

Compatibility remains in `app.js`: if old localStorage says `activeView = overview`, it redirects to `projects`.

## Important Product Direction

The user does not want:

- generic dashboard cards;
- fake analytics;
- huge blocks that occupy space without action;
- decorative progress bars;
- “life dashboard” vibes;
- Telegram-chat chaos;
- random “smart” widgets without real data;
- UI that the user has to art-direct through screenshots.

The user does want:

- clean, practical productivity app;
- standard task tracker logic;
- calm, premium, focused UI;
- references in spirit: Linear, Weeek, Notion minimal mode, Readwise, Obsidian, Cron;
- possibly white/blue or white/green palette, but not “just recolor”;
- real information architecture before visual styling;
- AI that can operate the system and challenge decisions;
- phone + laptop sync later;
- possible Telegram Mini App as thin mobile client later.

## Design Failure History

Important: several iterations failed because they were cosmetic or invented widgets.

Failed directions:

- Copying/resembling the original blocky reference too directly.
- Giant cards/buttons.
- 3D/grid/retro reference styling.
- Fake weekly “load” percentages.
- Big dashboard panels with low information density.
- Color-only restyling.
- Projects screen with too much text and stacked sections.
- Board columns overflowing while there was unused space.
- Audit log taking half the screen with repeated cards.

User explicitly said the agent was behaving like a frontend repair bot, not a product designer. Do not keep doing small reactive CSS tweaks without a design concept.

## Installed Custom Skill

A custom local skill was created:

```text
/Users/maffaka/.codex/skills/second-brain-product-design
```

Purpose: product design and information architecture guardrails for this app.

Core rule from the skill:

> Do not add a visual block unless it gives the user a concrete next action, comparison, decision, or editable object.

Before any UI changes, use that skill and answer:

- What object does this manage?
- What decision does it help make?
- What can the user edit or confirm?
- What data backs it?
- Would this still make sense as a plain table?

The skill is useful but currently not enough by itself. The next agent should act as a senior product designer, not merely apply the skill as a checklist.

## Key Current Product Concepts

### AI Operator

Assistant should be an operator of system state, not just a chat.

It can:

- classify inbox text;
- create tasks;
- save notes;
- save memory items;
- move tasks across statuses;
- update daily focus/status;
- propose project journey stage transitions;
- mark uncertain actions as `needs_review`.

High-risk changes should require confirmation.

Every action should produce audit trail:

- what was understood;
- what changed;
- why;
- source object/message;
- status: `confirmed`, `needs_review`, `needs_confirmation`, etc.

### Task Statuses

Only five task statuses:

- `inbox`
- `backlog`
- `this_week`
- `today`
- `done`

### Visible Areas

MVP areas:

- `work`
- `personal`
- `health`

### Hero Journey Layer

Hero Journey applies only to projects/goals, not individual tasks.

Stages:

- `call` — Замысел
- `commitment` — Решение
- `preparation` — Подготовка
- `trial` — Испытание
- `crisis` — Узкое место
- `result` — Результат
- `integration` — Интеграция

Assistant may propose transition, user confirms.

## Current Screens

### Inbox

Currently contains:

- AI inbox composer.
- Raw inbox items.
- recent assistant actions.

Known issue:

- It still may feel like generic panels. Needs a stronger capture-processing-review workflow.

### Today

Currently contains:

- focus row;
- status buttons;
- task table;
- rituals;
- calendar;
- evening review.

Known issue:

- Still visually panel-heavy.
- Needs clearer hierarchy around “what do I do now”.

### Week

Currently contains:

- weekly focuses;
- this-week tasks;
- carry-over/backlog candidates.

Important:

- Do not reintroduce fake workload/load metrics.
- Day-by-day planning should wait until tasks have due dates/scheduled slots/calendar constraints.

### Projects

Currently contains:

- journey project list;
- selected project detail;
- stage timeline;
- related tasks;
- obstacles;
- stage events.

Known issue:

- Still too text-heavy and stacked.
- Better direction: split layout with compact project list/sidebar + selected project inspector/detail.

### Board

Currently contains:

- five kanban columns.

Recent issue:

- Done column was partially cut off despite empty space.
- CSS was adjusted: board uses `repeat(5, minmax(0, 1fr))`, no workspace max-width.

Known issue:

- Needs a real dense board style, not tall empty columns.

### Log

Currently contains:

- grouped assistant action list.

Known issue:

- Log should be compact audit table, not primary emotional surface.
- It should not consume lots of vertical space with repeated confirmations.

## Data Model Docs

Most important docs:

- `docs/interface-architecture-reset.md`: most current IA decision document.
- `docs/data-model.md`: Postgres target model.
- `docs/api.md`: API sketch.
- `docs/deployment.md`: target deployment notes.

Potentially stale docs:

- `README.md`
- `docs/mvp.md`

They still mention “dashboard”, “load overview”, and older nav assumptions. Treat `docs/interface-architecture-reset.md` as more current.

## Target Backend Architecture

Future target:

- PWA frontend.
- API service.
- Postgres source of truth.
- Background worker.
- LLM provider abstraction.
- Calendar read-only integration.

Calendar MVP policy:

- Read external events as constraints.
- Do not write calendar events.
- `CALENDAR_WRITE_ENABLED=false`.

## Deployment Thinking

For quick web deploy:

- frontend can go to Vercel/Netlify if separated/static;
- backend + Postgres can use Supabase/Render/Fly/Railway/VPS;
- user asked about Vercel/free deploy earlier;
- current local app is simple Node server and can run anywhere.

Telegram Mini App:

- Possible later as thin mobile client.
- Should not be source of truth.
- Same backend/API/database.
- Phone flow should prioritize Today, Inbox, Tasks, Review.

## User Preference / Communication Notes

User is blunt and design-sensitive.

They are frustrated because previous iterations required them to direct every detail. They expect the agent to bring stronger product/design judgment.

Do:

- be direct;
- acknowledge when a component is conceptually wrong;
- stop and rethink before coding;
- produce design alternatives before implementation;
- avoid pretending cosmetic changes are design work.

Do not:

- keep patching colors/padding as if that solves IA;
- create fake metrics;
- add widgets because “dashboard” sounds good;
- fill space just because there is room;
- make the user art-direct every step.

## Recommended Next Step

Stop iterating on the current UI directly.

Do a real design pass:

1. Create 2-3 separate concept screens as static HTML prototypes, not wired into the app.
2. Use same product objects but different layouts.
3. Show:
   - one desktop shell;
   - one Today screen;
   - one Projects or Board screen.
4. Only after user picks a direction, refactor the actual app.

Suggested concepts:

### Concept A: Dense Tracker

Inspired by Weeek/Linear.

- Left nav.
- Top command/search.
- Main table/list.
- Right object inspector.
- Minimal cards.

### Concept B: Calm Command Center

Inspired by Notion minimal / Readwise.

- Editorial typography.
- Fewer borders.
- Sectioned workbench.
- Strong text hierarchy.
- Still operational, not dashboard.

### Concept C: Assistant Workspace

Mobile/TG-friendly.

- Inbox and assistant actions central.
- Today as quick action list.
- More conversational, but stateful and auditable.

## Immediate Fixes If Continuing Current App

If the next agent must continue current app instead of doing concepts:

- Finish compact `Log` screen and verify it visually.
- Rename internal `runAutopilot` ids later if desired, but not necessary.
- Remove repeated old “Автопилот...” localStorage entries or group them everywhere.
- Make `Projects` a split view:
  - left: project list rows;
  - right: selected project detail;
  - compact stage row;
  - tabs/sections for tasks, blockers, events.
- Make `Board` dense and ensure all columns fit at desktop width.
- Reduce copy in cards aggressively.

## Commands

Run local app:

```bash
npm run dev
```

Check syntax:

```bash
node --check public/app.js
node --check public/sw.js
npm run check
```

Open:

```text
http://127.0.0.1:4173/?fresh=23
```

If port is occupied or server stale, kill the old node process on 4173 and restart.

## Important Files

- `public/index.html`: app shell/screens.
- `public/styles.css`: current visual system.
- `public/app.js`: local state + render logic + assistant heuristics.
- `docs/interface-architecture-reset.md`: current IA target.
- `docs/agent-handoff.md`: this file.
- `db/schema.sql`: target database schema.

## Final Warning For Next Agent

The user asked for a strong designer/architect, not a CSS assistant.

Do not start with implementation.

Start with product objects, screen purpose, layout concepts, and a clear reason why each visible block deserves space.
