# Codex UI Audit Next

Date: 2026-07-07

Scope: audit-only pass for the Daily OS / Second Brain PWA. No app code was changed.

Primary sources read:

- `PRODUCT.md`
- `DESIGN.md`
- `docs/interface-architecture-reset.md`
- `docs/ui-calibration-audit.md`
- `docs/full-redesign-lab-report.md`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/concepts/full-redesign-lab.html`

Available design skill used: `second-brain-product-design`. The named skills from the transfer note (`impeccable`, `design-taste-frontend`, `emil-design-eng`) are not visible in this Codex session.

## Executive Verdict

The app is directionally closer to the right IA than the older dashboard attempts, but it still feels patched because the UI is built from accumulated rescue passes, not from one clear screen architecture.

The strongest issue is not palette or font. It is object discipline:

- `Today` has a real primary object, but still mixes a day plan, habits, status toggles, and AI suggestions without a crisp "what do I do now?" hierarchy.
- `Week`, `Board`, and `Log` correctly hide the generic inspector, but the content still spends too much space explaining itself instead of behaving like a tracker.
- `Projects` has the most interesting product idea, but it still looks like a big feature demo rather than a workbench for one selected project.
- `public/styles.css` contains many versioned override layers (`v27`, `v31`, `v56`, `v58`, `v59`, `v60`, `v61`). This is now architectural debt, not harmless CSS history.

The next implementation should not be "make it prettier". It should be a structural cleanup: pick one shell grammar, delete obsolete CSS/DOM, then port screens one by one.

## Screen Verdicts

### Inbox

Current job: capture raw thoughts and let the assistant turn them into objects.

What works:

- The screen has the right primary object: incoming item.
- Composer, raw queue, assistant interpretation, and review context exist.
- The inspector can be justified here because selecting an inbox item should show interpretation and proposed actions.

Problems:

- It has three panels plus a global right inspector, which risks becoming a four-column explanation board.
- The "Оператор" panel and the inspector overlap conceptually: both explain what the assistant should do.
- Assistant feed is currently a generic recent-action stream, not a review queue for the selected inbox item.

Verdict:

Keep Inbox, but make it a two-zone screen: left capture/queue, right selected item review. Delete the extra operator-explainer panel or fold it into the selected item detail.

### Today

Current job: accepted daily plan and current/next action.

What works:

- The primary object is close: `dailyPlan.timeBlocks` and linked tasks.
- The selected day block inspector is legitimate on desktop.
- The old duplicate time spine appears hidden in current DOM/CSS.

Problems:

- The first screen still does not make the current action dominant enough. It shows focus, status buttons, block list, unscheduled tasks, review drawer, and inspector with similar visual weight.
- `renderAppInspector("today")` injects a generic AI proposal ("Держать главный блок до вечера...") rather than evidence tied to selected block data.
- `renderHabits()` expects `#ritualScore` and `#habitList`, but these nodes are not in the current `public/index.html`; this is dead UI logic or a missing compact ritual block.
- The day block list is useful, but cards can still become too verbose. Today should scan like a work plan, not like an article.

Verdict:

Today should be rebuilt as a day workbench:

1. current/next block at top;
2. accepted blocks as dense rows;
3. tasks without blocks as a small queue;
4. compact rituals only if they are real checkable objects;
5. inspector only for selected block or selected task.

### Week

Current job: weekly commitment.

What works:

- The model is much better than the old fake "load" widgets.
- It separates weekly focuses, week tasks, and backlog/carry-over.
- Generic inspector is hidden for Week after `v60`.

Problems:

- The explanatory copy still feels like internal product notes on the interface.
- Focus progress is rendered as `% направления`, but the source is not clearly backed by behavior. This can read as fake analytics unless tied to completed tasks or accepted milestones.
- Week tasks include both `today` and `this_week`, which can be valid, but the UI does not distinguish "already pulled into today" from "still weekly pool".

Verdict:

Week should become a compact commitment table:

- left: 1-3 strategic stakes;
- center: committed actions grouped by focus/project;
- bottom/right: backlog candidates with accept/defer controls.

No inspector by default. Show an inspector only after selecting a focus/task.

### Projects

Current job: long-running projects, Hero Journey stage, blockers, linked tasks/history.

What works:

- Project title and stage are separated.
- Hero Journey lives in Projects, not globally.
- The screen now uses full canvas and hides the redundant global inspector.
- The detail panel includes stage map, quest, transition criteria, linked tasks, and stage history.

Problems:

- The layout still has "feature showcase" energy: a large project hero, 7-stage map, quest cards, linked tasks, and history all compete at once.
- The stage map is visually loud for something that is metadata and diagnostic. It should support decisions, not dominate every project detail.
- The project list plus detail is correct, but the detail needs clearer hierarchy: current stage, blocker, next transition, then tasks/history.
- Progress as `% пути` is motivational, but it can become fake precision. Better: stage name + risk/transition status first, progress second or hidden.

Verdict:

Projects is the best candidate for the first real refactor because it contains the most product-specific value. Treat Hero Journey as a diagnostic layer:

1. selected project header;
2. current stage and why;
3. next transition / confirmation needed;
4. blockers;
5. linked tasks;
6. stage history collapsed or secondary.

### Board

Current job: task status pipeline.

What works:

- Columns match the intended statuses: Inbox, Backlog, This week, Today, Done.
- Inspector is hidden after `v60`, which is correct.
- Board is now plain and closer to a standard tracker.

Problems:

- The intro block repeats what the board is instead of adding operational value.
- Columns have large minimum heights, so empty or sparse states occupy too much screen.
- At some widths, five equal columns remain cramped while the page has unused surrounding space or awkward scroll behavior.
- Task cards lack enough density for a tracker: no clear selected state, no quick move controls, no grouping by project/area.

Verdict:

Board should be boring and dense. Remove the intro explainer, reduce empty column height, use compact cards, and add basic movement affordances later.

### Log

Current job: assistant action audit event.

What works:

- The data model has action title, reason, status, and timestamp.
- Duplicate grouping in `groupAssistantActions()` is a good direction.
- Log as a separate screen is correct.

Problems:

- The current log item is too thin for the promised audit trail. It does not show source input, interpretation, changed objects, or before/after.
- `renderActionItem()` truncates title/reason to one line via CSS, which hides the exact thing a log should preserve.
- `confirmed` repeats everywhere and can create visual noise if not grouped by session/day.

Verdict:

Log should be a table/list of auditable events, not a feed of pills. It needs columns or rows for source, interpreted object, changed object, reason, status, time.

## Patched CSS vs Designed UI

The clearest evidence of patched UI is `public/styles.css` itself:

- base app shell starts as a left sidebar + workspace;
- `v27` adds a visually obvious Today pass;
- `v31` adds Operating Table inspector;
- `v31.1` makes inspector the only desktop right rail;
- `v56` turns the app into top navigation + right inspector;
- `v58` patches IA clarity and overlap;
- `v59` patches project map/title collisions;
- `v60` hides inspector on Week/Projects/Board/Log;
- `v61` expands Projects again.

That means the cascade is doing product strategy. This is fragile. The next implementation should delete obsolete rules instead of appending `v63`.

Concrete cleanup targets:

- Remove unused legacy classes if no longer in DOM: `.tracker-view`, `.tracker-main`, `.tracker-inspector`, `.time-plan`, `.time-block-row`, `.time-spine-panel`, `.assistant-challenge-rail`, old `.project-card-header`, old `.stage-timeline` if replaced by `.journey-map`.
- Remove dead habit UI or restore it intentionally: `renderHabits()` targets `#ritualScore` and `#habitList`, but current `index.html` does not contain them.
- Stop using body-view overrides as the main layout engine. They are acceptable for small screen-specific changes, not for core shell architecture.
- Consolidate button/card/tag rules so every screen is not inventing a slightly different object style.

## Inspector Policy

Use inspector:

- Inbox: yes, for selected inbox item interpretation/proposed action.
- Today: yes, for selected block or selected task.
- Week: no by default; yes only after selecting a focus/task.
- Projects: no global inspector; project detail already is the inspector. Optional internal side panel only if the selected project has a selected task/blocker.
- Board: no by default; a task drawer can appear after selecting a card.
- Log: no by default; event detail drawer only when selecting an audit event.

Do not reserve inspector space just because the shell supports it. Empty context is worse than no context.

## Layout And IA Changes Needed

1. Choose shell grammar:
   - Desktop: compact top tabs or compact left nav, but not a confused mix.
   - Current `index.html` uses `<aside class="sidebar">`, while `v56` turns it into a sticky topbar. This is semantically odd and makes future layout work harder.

2. Make screens object-first:
   - Inbox = selected incoming item.
   - Today = selected current/next time block.
   - Week = selected weekly commitment.
   - Projects = selected project.
   - Board = selected task status.
   - Log = selected assistant action.

3. Remove explanatory product copy from operational screens:
   - Keep labels and empty states.
   - Delete paragraphs that explain "this is not Jira" or "this is not a day plan" from the daily working UI.

4. Replace fake or weak precision:
   - `% пути` and `% направления` should be secondary or removed unless backed by real transitions/tasks.
   - Prefer status labels: `needs_confirmation`, `blocked`, `ready_for_transition`, `committed`.

5. Make dense tracker surfaces:
   - Board and Week should use rows/lists more than cards.
   - Cards are acceptable for project summaries and selected-object detail.

## Recommended Implementation Plan

### Phase 1: CSS/DOM Reset, No New Features

Goal: stop the cascade from fighting itself.

- Create a clean section structure in `styles.css`: tokens, shell, shared components, screen layouts, responsive.
- Delete obsolete versioned blocks after confirming matching DOM is gone.
- Decide whether global navigation is top tabs or left sidebar for the main app. Given the current user preference for ordinary trackers, left sidebar is probably safer for desktop; mobile can use bottom/top compact tabs.
- Keep app behavior unchanged while cleaning layout.

Done when:

- no horizontal page overflow on desktop;
- no screen relies on a hidden global inspector unless it actually needs it;
- CSS no longer has version labels as architecture.

### Phase 2: Board as Dense Tracker

Goal: produce one obviously cleaner screen with standard tracker structure.

- Remove `board-intro`.
- Reduce empty column height.
- Make cards compact and scannable.
- Use full available width; no clipped Done column.
- Add selected-card state only if a detail drawer/inspector exists.

Why first: Board is easiest to judge visually and has the least product ambiguity.

### Phase 3: Projects Workbench

Goal: make Hero Journey useful without turning Projects into a gamified poster.

- Left: compact project list with stage/risk/needs confirmation.
- Main: selected project detail.
- Order detail by decision importance: current stage, reason, next transition, blockers, linked tasks, history.
- Collapse or soften the 7-stage map.

Why second: Projects contains the unique Second Brain value and the user's gamification idea.

### Phase 4: Today Workbench

Goal: first open answers "what now?" in under 10 seconds.

- Top: current/next block with primary action.
- Main: accepted blocks as dense schedule.
- Side/detail: selected block with linked tasks and assistant challenge.
- Compact rituals only if actual checklist nodes exist.
- Evening review as a bottom drawer/section, not a large permanent block.

Why third: Today matters most, but it should be rebuilt after shell and object patterns are stable.

### Phase 5: Log And AI Audit

Goal: make AI autonomy credible.

- Replace feed cards with audit rows.
- Show source, interpretation, changed object, reason, status.
- Group repeated autopilot actions by run/session.
- Stop truncating audit reasons by default.

## Browser Verification Checklist For Next Implementation

Run app at:

```text
http://127.0.0.1:4173/?fresh=<next>
```

Verify at desktop widths `1440x900` and `2048x1152`, and mobile `390x844`.

Required measurements:

- `document.documentElement.scrollWidth > window.innerWidth` is `false` unless the current screen intentionally uses an internal horizontal scroller.
- `.workspace.getBoundingClientRect().width` uses the available canvas; no central content should be cramped while a right area is empty.
- `.app-inspector` visible only on Inbox/Today when a meaningful selected object exists.
- Board: `#taskBoard.getBoundingClientRect().right <= window.innerWidth` on desktop; Done column fully visible.
- Projects: `.project-detail-panel.getBoundingClientRect().width >= 700` on desktop.
- Today: selected/current block is visible above the fold; no duplicate time spine.
- Week: no fake load widget; focuses/tasks/backlog fit without giant empty cards.
- Log: audit reason/source is readable, not ellipsized into useless text.

Interaction checks:

- Switch every nav item and confirm topbar action label matches the screen.
- Add an inbox item and confirm it creates or proposes a real object and appears in Log.
- Toggle a Today task and confirm day progress/action log updates without duplicate noise.
- Run the primary action on each screen and confirm it changes relevant state only.

Visual checks:

- No giant empty columns for sparse data.
- No cards inside cards.
- No explanatory paragraph occupying space that should belong to objects.
- No blue-purple gradient/glass/dashboard styling.
- Typography remains dense and legible on mobile.

## Immediate Next Slice Recommendation

Start with Phase 1 + Phase 2:

1. clean the shell/CSS enough that the app has one layout grammar;
2. rebuild Board as a dense, normal tracker.

This gives a visible difference without touching the most ambiguous product logic. After that, port the same object-density rules to Projects and Today.
