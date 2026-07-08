# UI Calibration Audit — Impeccable + Taste + Emil

## Verdict

The previous problem was not a single CSS bug. It was calibration drift:

- screens reserved columns without meaningful selected objects;
- topbar actions were generic and sometimes wrong for the current screen;
- Hero Journey stage was visually merged into the project name;
- Week focus/tasks/backlog had unclear semantics;
- visual fixes were layered as CSS overrides instead of being tied to screen jobs.

## Tool calibration

### Impeccable lens

Use as the primary workflow for this project because Daily OS is product UI.

Rules imported:

- Read product/design context before touching UI.
- Pick product register, not brand/landing register.
- Run layout/critique before polish.
- Harden for overflow, responsive behavior, text length, and contrast.
- Avoid cards-in-cards and fake dashboard widgets.

### design-taste-frontend lens

Use as critic only.

Reason: the skill says it is for landing pages, portfolios, and redesigns — not dashboards, data tables, or multi-step product UI. Still useful to identify AI-slop tells:

- generic SaaS gradients;
- card soup;
- symmetrical filler blocks;
- weak hierarchy;
- decorative motion;
- default “AI dashboard” look.

### emil-design-eng lens

Use after IA/layout is correct.

Rules imported:

- polish small interaction details only after screen architecture is right;
- avoid pointless animation;
- buttons need responsive press/active states;
- prefer exact transitions over `transition: all`;
- review with Before / After / Why.

## Current screen calibration

### Today

Status: acceptable structure after previous passes.

Keep:

- top global nav;
- one accepted day plan surface;
- selected block inspector.

Watch:

- action button should be Today-specific;
- no duplicate rails;
- no extra AI panel unless it controls selected block.

### Week

Status: corrected semantics.

Keep:

- focuses = strategic stakes;
- tasks = executable actions;
- backlog = candidates not accepted.

Rule:

- No right inspector until a focus/task is selected.

### Projects

Status: v61 is the first materially visible layout correction.

Keep:

- full-width project canvas;
- project list + wide detail;
- no redundant right inspector;
- project name separate from stage;
- visible `Спорт и восстановление` in project list.

Rule:

- Project detail should not be squeezed below ~700px on desktop.

### Board

Status: corrected as pipeline.

Keep:

- five status columns;
- plain dense task flow;
- no inspector by default;
- explanatory intro copy.

Rule:

- Board is not a day/week planner.

## Immediate calibration fix to apply

The topbar primary action still says `Проверить план` on every screen while the action primarily rebalances Today. This violates product-register clarity.

Required change:

- Today: `Проверить план` → rebalance Today.
- Week: `Проверить неделю` → sweep backlog into this week.
- Projects: `Проверить проекты` → review project stages.
- Board: `Разложить задачи` → same pipeline-oriented sweep.
- Inbox: `Разобрать входящие` → focus capture/processing.
- Log: `Обновить лог` → no destructive state change.

## Gate for future UI work

Before code:

1. State the screen job.
2. State the primary object.
3. State whether inspector is meaningful.
4. State what will be removed, widened, or renamed.
5. Verify with screenshot/computed widths.

Do not report success for changes that are only semantically correct but visually indistinguishable.
