# Stage: Project AI mentor

## Observable outcome

From a selected project, the user can request an evidence-based AI review and receive a compact diagnosis, challenge, and next action. A suggested journey-stage transition is never applied without explicit confirmation.

## Verified current state

- Projects already contain journey stage, transition criteria, linked tasks, obstacles, and stage-event history.
- `reviewProjectJourney()` currently uses deterministic local heuristics.
- Gemini is already configured server-side for Inbox through both `server.js` and a Vercel function.
- Stage confirmation and rejection already persist through `saveState()` and the audit log.

## In scope

- Add `POST /api/ai/journey-review` for local server and Vercel.
- Send only a bounded structured project context: project metadata, linked task summaries, open obstacles, and current day load.
- Store the latest mentor review on the project.
- Render diagnosis, challenge, recommendation, and evidence inside the project canvas.
- Convert a valid proposed stage into the existing confirmation-first stage proposal contract.
- Fall back to the existing deterministic review when AI is unavailable.

## Non-goals

- No chat surface or persistent conversation transcript.
- No automatic stage transition.
- No automatic task deletion, reprioritization, or project creation.
- No new database tables in this MVP slice.

## Primary object and screen job

Primary object: selected project. The Projects screen remains a project workbench. The mentor panel appears only after a review and does not reserve a global inspector.

## Data contract

`project.mentorReview` contains `diagnosis`, `challenge`, `recommendation`, `evidence[]`, `proposedStage`, `reason`, `reviewedAt`, and `provider`. Existing projects require no migration; the field is optional and normalized on use.

## Acceptance criteria

1. A review request contains bounded project evidence and no whole-state dump.
2. A successful review renders on the selected project and survives reload.
3. A stage suggestion creates one pending event and does not mutate `journeyStage`.
4. Confirm/reject continues to use the existing stage controls.
5. API/provider failure leaves the project usable and produces a deterministic review.
6. Desktop and mobile have no horizontal page overflow.
7. App checks and reliability contracts pass.

## Verification

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- Browser: `http://127.0.0.1:4174/?fresh=149`
- Desktop `1280x720`, mobile `390x844`.

## Risks and rollback

The model may overstate weak evidence. The UI labels evidence separately, bounds its length, and requires confirmation for stage changes. Rollback is limited to the journey-review endpoint, mentor rendering, and optional project field.

## Handoff prompt

Implement the Project AI mentor from this brief. Keep the review evidence-based, bounded, project-local, and confirmation-first. Verify fallback, persistence, desktop/mobile layout, and audit history before stopping.
