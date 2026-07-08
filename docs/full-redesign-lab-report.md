# Full Redesign Lab Report

## Purpose

This is a full concept reset, not a patch to the current app. The app source was intentionally not modified. The visual artifact is:

```text
public/concepts/full-redesign-lab.html
```

## A. Operating Table / Selected-object OS

Optimizes for clarity of system operation.

- Main metaphor: every screen has a selected object.
- Left: global navigation.
- Center: object list / workbench.
- Right: meaningful inspector with AI decisions.

Best when the product promise is: “I understand what object is being changed and why.”

Rejects from current app:

- vertical panels without a selected object;
- right-side dead space;
- assistant as decorative feed.

Risk:

- less emotional / less fresh than Journey Map;
- can become enterprise-ish if typography is not kept light.

## B. Day Timeline OS

Optimizes for daily use.

- Main metaphor: the day is a timeline.
- Time spine is permanent.
- Blocks are the primary objects.
- AI challenges are pinned to time blocks.

Best when the product promise is: “I know what I am doing now, what is next, and what the assistant challenges.”

Rejects from current app:

- Today as stacked cards;
- AI review as separate panel;
- task table detached from time.

Risk:

- can underplay long-term projects unless connected to quests.

## C. Journey Map OS

Optimizes for motivation and life-project meaning.

- Main metaphor: large focuses are chapters.
- Today is derived from active quests.
- Hero Journey is central and visible.

Best when the product promise is: “My day comes from bigger life quests, not random tasks.”

Rejects from current app:

- Hero Journey as tiny progress strip;
- project list as ordinary task tracker;
- gamification applied to every small task.

Risk:

- can become too conceptual if Today actions are not kept concrete.

## Recommendation

Use a hybrid, but choose a primary shell:

1. Primary shell: **A. Operating Table**
2. Today screen inside shell: **B. Day Timeline**
3. Projects screen: **C. Journey Map**

Why:

- A solves the recurring layout problem: every screen has center workbench + right inspector.
- B solves the daily planning problem: time becomes the skeleton.
- C preserves the emotional Hero Journey layer for large projects only.

## First port if chosen

Port A as the global shell first:

```text
left nav → center workbench → right inspector
```

Then keep the current Today Workbench as the first real screen inside that shell.

Do not port visual decoration first. Port the screen architecture first.
