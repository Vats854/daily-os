# Daily OS / Second Brain — Design Context

## Design read

Reading this as: a PWA productivity/workbench product for a single power user, with calm dense operational UI, leaning toward Linear/Weeek/Notion/Readwise/Cron product grammar plus a restrained Hero Journey layer only inside Projects.

## Calibration sources

Applied criteria from:

- Impeccable: product-register frontend, layout/spacing/typography/a11y/hardening, avoid card soup and generic AI-SaaS tells.
- design-taste-frontend: anti-slop discipline, read the room, avoid default AI purple/gradient/glass/card patterns. Used as critic only because the skill itself says it is not primarily for dashboards/multi-step product UI.
- emil-design-eng: interaction polish, exact transitions, active states, invisible details. Use after IA/layout is correct.

## Visual language

- Calm light canvas.
- Dense but readable rows/lists.
- One strong accent per screen.
- Typography can be editorial in focus/project headers, but must not break layout.
- Prefer rows, workbenches, and selected-object layouts over stacked dashboard cards.
- Cards are allowed only when they contain a real object or decision; no cards inside cards as decoration.

## Screen jobs

### Today

Job: show accepted plan for the day and current/next action.

Must show:
- daily focus;
- accepted time blocks;
- linked tasks;
- tasks without a block;
- evening review;
- meaningful inspector for selected block.

Avoid:
- duplicate schedule/time-spine representations;
- generic permanent AI rail;
- global project journey.

### Week

Job: choose what belongs in the week and what does not.

- Weekly focuses are strategic stakes.
- Week tasks are executable actions.
- Backlog/carry-over are candidates not yet accepted.
- No inspector unless a task/focus is explicitly selected.

### Projects

Job: manage long-running projects and Hero Journey stages.

- Project name and stage must be separate.
- Stage is metadata, not part of the project title.
- Show quest, transition criteria, blockers, linked tasks/history.
- Use wide canvas; do not squeeze the project map while empty columns exist.

### Board

Job: execution progress independently from planning horizon.

- Not started → In progress → Done.
- Inbox, Backlog, This week, and Today remain planning metadata shown on cards.
- Moving a card never changes when the task is planned.
- Plain and dense.
- Not a duplicate Today/Week planner.
- No inspector unless a task is selected.

## Anti-patterns to reject

- “Looks changed” only by adding another CSS override layer.
- Giant titles colliding with navigation.
- Inspector shown with generic filler text.
- Topbar action that does the wrong thing for the current screen.
- Project detail squeezed under 650px on desktop while empty side rails exist.
- Horizontal page overflow.
- Cards that contain no editable object, decision, or state.
- Unexplained percentages or progress bars.
- Generic AI dashboard aesthetics: purple gradients, glass panels, fake metrics, symmetrical fluff.

## Layout rules

1. Full desktop canvas should be used before introducing horizontal scroll.
2. Inspector is screen-specific:
   - Today: selected day block is meaningful.
   - Projects: optional; hide if it squeezes the actual project workbench.
   - Week/Board/Log: hide by default until selection exists.
3. If a screen has no selected object, do not reserve a right rail.
4. Keep global nav visible as top tabs.
5. Before reporting success, verify in browser with computed widths and screenshot.

## Interaction polish rules

- Avoid `transition: all`.
- Buttons need a small active state.
- Frequent actions should feel instant, not animated.
- Motion should explain state or provide feedback; no decorative looping.
- Error/empty states should say what to do next.
