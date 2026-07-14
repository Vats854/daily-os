# Stage: Pre-MVP daily readiness

## Outcome
Daily OS opens without a recurring auth wall, starts clean for a new user, and protects frequent destructive actions with lightweight undo and an honest offline state.

## Scope
- Non-blocking GitHub authentication with background session restoration.
- Clean initial state for browsers/accounts without saved state.
- One-level undo for task completion and task/note deletion.
- Compact offline notice; local edits continue and sync later.

## Non-goals
- Guided onboarding, push notifications, Apple Calendar, new modules, or a general history engine.
- Replacing existing local/cloud data or changing Supabase schema.

## Acceptance criteria
1. Checking and signed-out states show the app, never a full-screen gate.
2. GitHub sign-in remains available in the header and sync popover.
3. A new state has lists/settings but no demo tasks, notes, projects, habits, or blocks.
4. Task completion and task/note deletion show a working `Отменить` action.
5. Offline mode is visible without blocking local work.
6. Existing stored/cloud state remains unchanged.
