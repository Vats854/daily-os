# Today composition calibration v211

## Outcome

Today reads as one accepted daily plan at wide desktop sizes: navigation remains fully visible, focus anchors the workbench, tasks use a deliberate reading width, and evening review reads as a closing action.

## Verified current state

- The current v210 screen is functionally stable in light and dark themes.
- At the supplied wide desktop viewport, the sidebar counters are clipped and the icon rail touches the viewport edge.
- The Today workbench expands across the remaining canvas, leaving weak relationships between focus, tasks, and review.
- No inspector is visible because no block or task is selected.

## Scope

- Calibrate desktop shell gutters and sidebar width.
- Give Today a bounded but generous content measure.
- Tighten the vertical relationship between composer, focus, task list, and review.
- Make the existing evening review look actionable without turning it into a dashboard card.
- Preserve light/dark parity and current mobile behavior.

## Non-goals

- No new features, objects, data, interactions, or navigation.
- No Calendar, Habits, Week, Projects, Notes, sync, or AI changes.
- No deployment, framework migration, or build tooling.

## Screen contract

- Primary object: accepted daily plan.
- Screen job: show focus, accepted blocks, linked tasks, tasks without blocks, and review.
- Inspector: hidden until a meaningful object is selected.
- Data contract and migration: unchanged.

## Acceptance criteria

- Sidebar labels and counters fit without clipping at 1440 px and the supplied wide viewport.
- Today content has an intentional maximum reading width while still using the desktop canvas.
- Focus, unscheduled tasks, and review read as one ordered plan.
- No horizontal page overflow at 1440×900 or 390×844.
- Light and dark themes preserve readable contrast.
- Existing checks pass.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser: `http://127.0.0.1:4174/?fresh=211` at 1440×900, 2048×990, and 390×844.
- Record page overflow, main width, Today workbench width, sidebar width, inspector visibility, and key section fit.

## Risks and rollback boundary

- Risk: a wide-screen correction could over-constrain normal laptop widths or disturb the mobile shell.
- Rollback boundary: v211 Today/shell CSS and matching asset/cache version bumps only.

## Handoff prompt

Verify Today v211 at desktop and mobile widths in both themes. Preserve the accepted-plan screen job and make only bounded geometry or contrast fixes; stop when the acceptance criteria pass.
