# Daily OS / Second Brain — Codex Agent Instructions

## Project

This repo is a PWA-first Daily OS / Second Brain prototype.

It is **not** a Telegram chatbot, generic dashboard, marketing landing page, or fake analytics product.

Core promise: the user opens the app and sees what matters now, what is committed, what needs review, and what the AI operator changed or challenged.

## Required context before coding

Read these first:

1. `PRODUCT.md` — product context and primary objects.
2. `DESIGN.md` — design register, anti-patterns, screen jobs.
3. `docs/interface-architecture-reset.md` — target IA and what to remove.
4. `docs/ui-calibration-audit.md` — current calibration after Impeccable/Taste/Emil review.
5. `docs/full-redesign-lab-report.md` — preferred shell direction.

If these documents conflict, prefer:

`PRODUCT.md` + `DESIGN.md` → current source of truth.

## Large-stage workflow

For a substantial feature, cross-module change, architecture refactor, or redesign, use
the repository skill at `.agents/skills/run-daily-os-stage/SKILL.md` before coding.

- Write a compact stage brief under `docs/stages/`.
- Reference source-of-truth files instead of copying conversation history.
- State scope, non-goals, acceptance criteria, risks, and verification.
- Keep small follow-up fixes in the current task.
- Recommend a new Codex task only when the stage is independently reviewable; do not
  create a user-owned task without an explicit user request.

## Prompt discipline

For stage briefs, implementation prompts, and handoffs, follow the current OpenAI
GPT-5.6 prompting guidance:
`https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6`.

- Lead with the user-visible outcome, then constraints, available evidence, acceptance
  criteria, and a clear stopping condition.
- State the current work layer: research, design, implementation, verification, or
  external coordination.
- Preserve explicit user decisions; use decision rules for judgment calls instead of
  inventing broad defaults.
- Keep autonomy boundaries in one place: safe in-scope local changes and validation may
  proceed; destructive, external, costly, or materially expanded work requires approval.
- Remove repeated rules, inert examples, and unrelated tool instructions. Prefer the
  smallest prompt that still preserves correctness, evidence, and validation.

## User expectations

The user does not accept tiny CSS tweaks as redesign.

For product/design tasks, deliver visible UX/IA changes:

- changed layout or screen structure;
- clearer primary object per screen;
- meaningful use of width;
- no cramped content while side rails are empty;
- no duplicate representations of the same schedule/task/project;
- browser verification with screenshots or computed layout measurements.

## Current app files

Main app:

- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `public/sw.js`
- `server.js`

Concepts/prototypes:

- `public/concepts/*.html`
- `public/design-concept.html`

Career side project:

- `public/career/*`

Do not mix Career UI into Daily OS unless explicitly asked.

## Screen jobs

### Today

Primary object: accepted daily plan.

Must show:

- focus of the day;
- accepted time blocks;
- linked tasks;
- tasks without blocks;
- selected block inspector.

Do not add duplicate day timelines or global dashboard metrics.

### Week

Primary object: weekly commitment.

- Weekly focuses = strategic stakes, not checkbox tasks.
- Week tasks = executable actions.
- Backlog/carry-over = candidates not accepted.
- No right inspector unless a focus/task is selected.

### Projects

Primary object: long-running project.

- Project title and Hero Journey stage must be separate.
- Stage is metadata, not part of the name.
- Show quest, transition criteria, blockers, linked tasks/history.
- Use wide canvas; do not squeeze project map under 700px on desktop.
- Hide redundant inspector if it makes project detail cramped.

### Board

Primary object: task status pipeline.

Columns:

- Inbox
- Backlog
- This week
- Today
- Done

Board is not a Today/Week duplicate.

### Log

Primary object: assistant action/audit event.

Show source, interpretation, changed objects, reason, and status.

## Design rules

- Calm dense product UI: Linear / Weeek / Notion / Readwise / Cron grammar.
- Avoid generic AI-dashboard patterns: fake metrics, purple gradients, glassmorphism, decorative cards, meaningless widgets.
- Cards only when they contain an editable object, decision, state, or useful comparison.
- Use full desktop width before adding horizontal scroll.
- Inspector is screen-specific and should not reserve space without a meaningful selected object.
- Global app navigation should remain visible as compact top tabs; do not hide it behind a dropdown.
- Avoid duplicate schedule representations.

## Coding rules

- Keep vanilla HTML/CSS/JS unless user explicitly asks for framework migration.
- Preserve local dev simplicity.
- Do not introduce build tooling without asking.
- Avoid massive unstructured CSS override layers; prefer deleting/replacing obsolete rules when making large changes.
- Do not fabricate backend/API behavior. Current app is mostly client-side demo state.

## Verification

After changes run:

```bash
node --check public/app.js
node --check public/sw.js
node --check server.js
npm run check
```

Then verify in browser:

```text
http://127.0.0.1:4173/?fresh=<version>
```

If changing layout, report concrete measurements:

- page overflow true/false;
- main panel width;
- inspector visible/hidden;
- key cards/maps fit true/false.

## Versioning

When changing app assets:

- bump query params in `public/index.html` for `styles.css?v=N` and `app.js?v=N`;
- bump `CACHE_NAME` in `public/sw.js`.

## Good handoff output

For each substantial Codex task, write a report under `docs/`, e.g.:

```text
docs/codex-<task>-report.md
```

Include:

1. what changed;
2. why;
3. files edited;
4. checks run;
5. browser verification;
6. remaining risks.
