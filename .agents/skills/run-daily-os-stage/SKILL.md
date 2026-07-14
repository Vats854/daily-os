---
name: run-daily-os-stage
description: Plan and execute a substantial Daily OS development stage with a compact brief, explicit scope, acceptance criteria, verification, and a reusable handoff prompt. Use for cross-module features, architecture changes, redesigns, storage migrations, or work likely to span multiple implementation passes. Do not use for a tiny isolated fix.
---

# Run a Daily OS stage

## Establish the source of truth

Read `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, and only reports relevant to the requested
surface. Inspect current code and git status. Do not paste conversation history into the
brief; record verified repository facts and the user's latest intent.

## Decide whether this is a stage

Use this workflow when work crosses modules, changes information architecture, touches
persistence, or needs its own acceptance test. Keep narrow fixes in the current task.
Never create a user-owned Codex task automatically. Prepare a handoff prompt and require
an explicit user request before creating a separate task.

## Write the brief

Create `docs/stages/<stage-name>.md` with:

1. One observable user outcome.
2. Verified current state.
3. In scope and non-goals.
4. Primary object, screen job, and inspector behavior.
5. Data contract and migration notes.
6. Testable acceptance criteria.
7. Commands, browser routes, viewports, and measurements.
8. Risks and rollback boundary.
9. A compact handoff prompt.

Prefer one coherent vertical slice over unrelated improvements.

## Execute and close

- Follow existing vanilla HTML/CSS/JS patterns and preserve user data.
- Update the brief when discoveries change the plan.
- Run every check required by `AGENTS.md`.
- Verify UI work on desktop and mobile in a real browser.
- Write the required report under `docs/`, including remaining risks and the next
  smallest valuable stage.
