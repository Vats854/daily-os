# Agent Design Smoke Test

1. Project-local agent definitions exist.

The two Daily OS custom agents are:
- `daily-os-design-director`
- `daily-os-design-critic`

Both are defined under `.codex/agents/` and both declare `sandbox_mode = "read-only"`. Conceptually, this audit uses the director's product rules and the critic's anti-cosmetic standard.

2. Inbox verdict: yes, mostly solved.

The current Inbox now has the correct structural idea: capture, raw queue, and operator review as three visible zones. The CSS explicitly turns `.inbox-layout` into three desktop columns and removes the previous dead right side problem. The operator panel is not just a decorative card; it has a review job and vertical workspace.

Weakness: the operator note is still explanatory text, not an operational control. The right side is no longer unused, but it is not yet a hard review queue with explicit accept/reject/convert decisions as the dominant object.

3. Today verdict: still too much like pixel movement.

Today looks louder, but structurally it is still the same screen: focus headline, AI review block, time table, task table, then ritual/calendar/review inspector. Bigger typography, wider spacing, and a blue review panel make the change visible, but the underlying product shape did not move far enough.

The primary object is still split between "focus", "time blocks", "tasks", and "assistant review". There is no single accepted day plan object with committed blocks, challenged decisions, and unresolved conflicts presented as one operating surface. This is a weak pass visually and a fail structurally.

4. Next visible structural redesign task for Today.

Replace the stacked Today layout with a single "Day Plan" workbench:
- left rail: time spine from morning to evening
- center: committed blocks with embedded next action and task links
- right rail: assistant challenges and unresolved decisions tied to specific time blocks
- bottom or side drawer: evening review only after the day plan, not as another always-visible card

The visible change should be that time becomes the skeleton of the page. Tasks should attach to blocks or sit in a small unscheduled lane. AI review should not be a separate dashboard block; it should annotate the plan where the problem exists.

5. Next visible structural redesign task for Projects / Hero Journey.

Make the selected project detail become a real chapter map, not a project card plus mini timeline. The right detail area should open with current chapter, quest, transition criteria, blocker, and assistant assessment as the main object. The project list should stay compact on the left.

The Hero Journey should be large and meaningful only inside selected project detail. It should not read as seven equal status pills. The current chapter needs editorial weight; transition criteria need to look actionable; assistant assessment needs to challenge whether the project is allowed to move forward.

6. What should not be done next.

Do not do another CSS-only pass on Today.

Do not add more cards, pills, fake progress metrics, motivational widgets, or generic AI dashboard blocks.

Do not make Inbox prettier before turning the operator panel into concrete review actions.

Do not spread Hero Journey language into normal tasks.

Do not claim Today is redesigned until the page stops being a vertical stack of unrelated modules.
