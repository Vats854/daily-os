# Codex Transfer Plan — Daily OS

## Decision

Move Daily OS implementation work back into Codex/OpenClaw as the primary coding environment.

Hermes/Telegram should be used for:

- product direction;
- critique;
- deciding priorities;
- writing bounded Codex prompts;
- reviewing final reports/screenshots.

Codex/OpenClaw should be used for:

- editing `public/index.html`, `public/styles.css`, `public/app.js`;
- running browser verification;
- using installed design skills (`impeccable`, `design-taste-frontend`, `emil-design-eng`);
- producing implementation reports under `docs/`.

## Why

The project has crossed the point where Telegram-driven patching is efficient.

Problems with continuing primarily through Hermes chat:

- too much context lives in chat, not repo;
- CSS patches accumulate instead of being refactored;
- visual design needs browser iteration and screenshots;
- Codex has project-local agents and newly installed design skills;
- the user wants visible product-design work, not incremental text explanations.

## Source of truth now in repo

Codex must read:

- `AGENTS.md`
- `PRODUCT.md`
- `DESIGN.md`
- `docs/ui-calibration-audit.md`
- `docs/interface-architecture-reset.md`
- `docs/full-redesign-lab-report.md`

## Recommended Codex workflow

### 1. Start from project root

```bash
cd "/Users/maffaka/Documents/New project"
```

### 2. Restart Codex/OpenClaw runtime

Needed because new skills were installed under Codex home and may not be visible until restart.

### 3. First Codex task should be audit-only

Do not implement immediately.

Prompt:

```text
Use the project instructions in AGENTS.md.
Also use the installed skills in this order if available:
1. impeccable
2. design-taste-frontend as critic only
3. emil-design-eng for interaction/polish review only

Project: /Users/maffaka/Documents/New project

Task: Audit the current Daily OS UI and prepare the next implementation plan.

Read:
- PRODUCT.md
- DESIGN.md
- docs/interface-architecture-reset.md
- docs/ui-calibration-audit.md
- docs/full-redesign-lab-report.md
- public/index.html
- public/styles.css
- public/app.js

Do not edit app code yet.

Write docs/codex-ui-audit-next.md with:
1. screen-by-screen verdict: Today, Week, Projects, Board, Log;
2. what still feels like patched CSS instead of designed UI;
3. which screens should use inspector and which should not;
4. where layout/IA should be changed, not just styled;
5. what to delete or consolidate from CSS/DOM;
6. one recommended implementation plan with phases;
7. exact verification checklist for browser.

Be blunt. Avoid generic advice. Do not propose fake metrics/widgets.
```

### 4. Second Codex task should implement one slice

After user approves the audit, implement only one slice:

Recommended first slice:

```text
Refactor Projects screen into a clean wide workbench and remove old conflicting CSS rules instead of layering another override block.
```

Alternative first slice:

```text
Refactor Today into a clean selected-block workbench without duplicate schedule representations.
```

### 5. Every Codex implementation task must output a report

Example:

```text
docs/codex-projects-refactor-report.md
```

Must include:

- files changed;
- old structure removed;
- new structure added;
- checks run;
- browser screenshots/measurements;
- known tradeoffs.

## Role split

### Hermes role

- product owner;
- critique and prioritization;
- prompt writer;
- reviewer of reports;
- keeps Telegram conversation lightweight.

### Codex role

- code editor;
- browser QA;
- design-skill executor;
- report writer.

## Current known state

Latest app asset version: `v62`.

Recent fixes:

- Projects is full-width in v61+.
- Week/Board hide generic inspector by default.
- Topbar primary action is screen-specific:
  - Inbox: `Разобрать входящие`
  - Today: `Проверить план`
  - Week: `Проверить неделю`
  - Projects: `Проверить проекты`
  - Board: `Разложить задачи`
  - Log: `Обновить лог`

Known risk:

- `public/styles.css` contains many accumulated override layers (`v58`, `v59`, `v60`, `v61`). Future work should refactor/reconcile CSS rather than keep appending overrides forever.

## Stop condition

Do not keep implementing inside Hermes unless:

- the task is a tiny patch;
- Codex/OpenClaw is unavailable;
- user explicitly asks Hermes to edit directly.

Default mode going forward: Hermes prepares/reviews, Codex implements.
