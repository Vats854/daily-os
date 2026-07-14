# Daily OS MVP stabilization and design pass

## Scope

This pass audited the active task-core shell rather than extending the legacy dashboard UI. The product job is a coherent Daily OS in which tasks, calendar blocks, habits, notes, focus sessions, projects, and assistant actions are reachable from one predictable shell.

## What changed

- Added `Projects` and `Log` to the active module architecture and icon rail.
- Restored the AI Inbox as a first-class `Входящие` module in the active shell:
  raw capture, Gemini/local classification, interpretation, linked object, and
  explicit follow-up actions are visible without opening the legacy UI.
- Added Lucide-style project and history icons as local assets.
- Rebuilt Projects as a wide operating surface:
  - active project index;
  - project title and stage kept separate;
  - seven-stage journey track;
  - next transition;
  - obstacles;
  - linked tasks that open in the task module;
  - transition history;
  - working journey review and confirmation actions;
  - inline project creation through the standard composer.
- Rebuilt Log as a dense audit table with timestamp, action, reason, and translated status.
- Fixed the active Log reading `detail` even though assistant actions store their explanation in `reason`.
- Added mobile layouts for project navigation, journey, project details, and log rows.
- Added consistent focus-visible styling and extended the optional editorial font to project titles.
- Preserved the existing functional modules: tasks, calendar, habits, focus, and notes.

## Product decisions

- Projects own the Hero Journey layer. It does not appear in Today, tasks, or habits.
- Log is read-only audit evidence, not a second assistant chat.
- The project screen uses one wide canvas and does not reserve a generic right inspector.
- New projects begin at `call` and require value/scope clarification before automatic progression.

## Functional readiness matrix

| Module | Current state | Main remaining risk |
| --- | --- | --- |
| Tasks | CRUD, lists, task detail, context menu, subtasks, tags, focus linking | No conflict-safe multi-device writes |
| Calendar | Weekly grid, drag/resize/create, multi-day range, recurrence, reminders | External Apple calendar not connected |
| Habits | Create and daily completion state | Editing schedule/archiving is still limited |
| Focus | Timer and generated sound categories | Sessions depend on an open PWA process |
| Notes | Folders, editor, tags, search | No attachments or rich-text blocks |
| Projects | Journey, blockers, linked tasks, review/confirm | Project editing remains intentionally narrow |
| Log | Action, reason, timestamp, status | Source-object links are not normalized yet |

## Architecture audit

The active interface is the `simple-app` task-core shell, but the repository still contains the previous dashboard renderers and CSS in `public/app.js`, `public/styles.css`, and the lower legacy DOM in `public/index.html`. They are not the chosen product direction and increase change risk.

The current cloud model stores one complete JSON state per user in `daily_os_states`. This is adequate for a single-user MVP, but concurrent phone/laptop edits are last-write-wins and can overwrite each other. The next technical foundation should add revision checks or normalize high-write objects before more collaboration-like behavior is added.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`
- Browser navigation verified for Projects and Log.
- Projects canvas at 1280px viewport: 661px inside a 915px workbench, no page overflow.
- Log reasons render from the correct field and status labels are visible.

## Recommended next slice

1. Isolate or remove the legacy dashboard DOM/render path.
2. Add revision-aware Supabase sync to prevent silent cross-device overwrites.
3. Run one complete real-life workflow test: capture thought → create task/note → schedule → focus → complete → audit log.
4. Only then extend AI autonomy and external calendar integration.
