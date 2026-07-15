# Stage: Legacy dashboard isolation

## User outcome

Daily OS always opens as one coherent task-core product. The retired dashboard cannot
appear underneath, beside, or instead of the production shell after navigation, auth,
sync, or a partial render failure.

## Verified current state

- `#simpleApp` is the production shell and `render()` exits after `renderSimpleApp()`.
- The retired dashboard still exists as a hidden live DOM subtree in `index.html`.
- Legacy event bindings still assume that retired nodes exist.
- Production reliability checks currently require the hidden dashboard to exist.

## Scope

- Move retired dashboard markup into an inert archive template.
- Make legacy-only bindings null-safe so the production page cannot fail without those nodes.
- Update reliability contracts to require one live application shell.
- Bump application and service-worker asset versions.

## Non-goals

- Delete legacy renderer functions or the legacy CSS bundle in this stage.
- Change state, sync, tasks, habits, calendar, notes, projects, or focus behavior.
- Redesign any production screen.

## Product contract

Primary object and screen jobs remain unchanged. The production shell owns navigation,
content, detail panels, and interaction. Archived markup has no layout, focus, or
accessibility presence.

## Data and migration

No state migration. Existing local and Supabase state remains byte-compatible.

## Acceptance criteria

1. Exactly one live app shell exists in the document.
2. `.legacy-app`, `#todayView`, and `#appInspectorContent` are absent from the live DOM.
3. Retired markup is inert inside `#legacyDashboardArchive` only.
4. All task-core modules open without console errors on desktop and mobile.
5. Existing reliability and syntax checks pass.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser: `http://127.0.0.1:4173/?fresh=137`
- Desktop 1440x900 and mobile 390x844: overflow, live shell count, archive state.

## Risks and rollback

Legacy global handlers share some active task-core behavior. Only legacy element-bound
listeners become null-safe; shared delegated handlers remain. Rollback boundary is the
template wrapper, listener guards, and v137 asset bump.

## Handoff prompt

Remove the archived legacy dashboard, then identify and delete legacy-only renderers and
CSS with contract tests proving that task core, notes, calendar, habits, focus, projects,
auth, and sync are unaffected.
