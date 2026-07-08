# Personal Passport Methodology

## Purpose

The Personal Passport is a structured method for digitizing a person's context so the assistant can help choose goals, projects, weekly actions, rhythm, and environment with better fit.

It is not a medical, psychotherapeutic, or diagnostic system. Tests are optional support tools. The core source of truth is a combination of facts, lived examples, repeated patterns, and user-confirmed conclusions.

The main output is not a large self-description. The main output is a practical operating profile:

- personal passport;
- values map;
- energy and constraint map;
- motivation map;
- professional map;
- repeated pattern list;
- contradiction list;
- project filters;
- decision rules;
- open hypotheses to test.

## Core Principles

- Separate facts from interpretations.
- Treat tests as signals, not verdicts.
- Save uncertainty instead of hiding it.
- Keep contradictions visible.
- Convert stable conclusions into practical rules.
- Make every profile block useful for goals and projects.
- Prefer several focused sessions over one huge questionnaire.

## Data Types

Every extracted item should use one of these types:

```text
Type: fact | observation | self_description | hypothesis | conclusion | rule | contradiction
Text:
Source:
Confidence: low | medium | high
Related areas:
Project impact:
What to check next:
```

Definitions:

- `fact`: a concrete event, metric, decision, or circumstance.
- `observation`: a repeated pattern noticed from facts or reviews.
- `self_description`: how the user describes themself.
- `hypothesis`: a plausible explanation that still needs testing.
- `conclusion`: a stable interpretation supported by several signals.
- `rule`: a user-confirmed decision principle.
- `contradiction`: a tension between goals, values, behavior, resource, or identity.

## Personality Model

The v1 passport uses 12 blocks. Each block should be filled through questions, examples, optional tests, and later diary/project evidence.

### 1. Body And Energy

Why it matters:

Goals and projects fail when they ignore sleep, recovery, health constraints, and real energy cycles.

What to collect:

- sleep and recovery patterns;
- sport and physical load;
- energy by time of day and week;
- food, caffeine, alcohol, and other state factors;
- chronic limitations or recurring pain;
- signs of overload and recovery.

Recommended diagnostics:

- wearable data from Whoop, Oura, Garmin, or Apple Health if available;
- subjective daily energy score;
- sleep and recovery notes.

Questions:

- When during the day do I usually have the most usable energy?
- What destroys my state fastest?
- What restores me reliably?
- How do I behave when tired?
- What physical signals do I usually ignore?
- Which goals become unrealistic when sleep or recovery is bad?
- Which activities give energy instead of taking it?
- What should never be scheduled after poor sleep?

What the assistant should extract:

- stable energy windows;
- recovery requirements;
- overload signals;
- planning constraints;
- rules for decision-making under fatigue.

Project impact:

Projects should be filtered by the amount, timing, and consistency of energy they require.

### 2. Temperament

Why it matters:

Temperament describes the user's default nervous-system and behavior tendencies. It helps adapt plans to the person instead of forcing one generic productivity style.

What to collect:

- introversion/extraversion;
- openness to novelty;
- tolerance for uncertainty;
- need for structure;
- risk appetite;
- decision speed;
- response to pressure.

Recommended diagnostics:

- Big Five/OCEAN;
- HEXACO if deeper personality data is needed;
- BIS/BAS for avoidance and approach motivation.

Questions:

- In what conditions do I naturally become stronger?
- In what conditions do I start degrading?
- Do I need structure, freedom, or a mix?
- What tires me faster: people, chaos, boredom, pressure, or uncertainty?
- Where do I confuse fear with "not mine"?
- Where do I confuse novelty with real interest?
- What kind of deadlines help me?
- What kind of deadlines damage quality or health?

What the assistant should extract:

- preferred operating conditions;
- likely stressors;
- useful constraints;
- risk zones for project design.

Project impact:

Projects should match the user's tolerance for uncertainty, structure, social load, and risk.

### 3. Values

Why it matters:

Values decide whether a goal feels meaningful after the first excitement fades.

What to collect:

- core values;
- anti-values;
- non-negotiable principles;
- admired traits;
- sources of respect and disgust;
- acceptable and unacceptable compromises.

Recommended diagnostics:

- Schwartz values;
- VIA character strengths;
- analysis of major past decisions.

Questions:

- Which life decisions do I respect most?
- What do those decisions have in common?
- What do I refuse to build even if it brings money or status?
- What makes success feel empty?
- What am I willing to suffer for?
- Where have I betrayed myself?
- What do I admire in other people?
- Which compromises are never worth it?
- Which values are currently in conflict?
- What should my projects protect?

What the assistant should extract:

- value hierarchy;
- anti-values;
- project constraints;
- value conflicts;
- decision rules.

Project impact:

Every serious project should be checked against values and anti-values before it becomes a plan.

### 4. Motivation

Why it matters:

Values say what matters. Motivation explains what actually moves the user into action.

What to collect:

- intrinsic and extrinsic motivators;
- autonomy, mastery, relatedness;
- status, money, recognition, security, freedom;
- sources of excitement and resistance;
- abandoned goals and completed goals.

Recommended diagnostics:

- Self-Determination Theory reflection;
- achievement/power/affiliation motive review;
- completed-versus-abandoned goal analysis.

Questions:

- What do I do even without external pressure?
- What kind of reward actually works on me?
- What kind of pressure makes me resist?
- Which goals did I complete, and why?
- Which goals did I abandon, and why?
- When do I need accountability?
- When does accountability become control?
- What am I trying to prove through my goals?
- What gives me a feeling of progress?
- Which projects feel alive before they are useful?

What the assistant should extract:

- dominant motivators;
- demotivators;
- accountability preferences;
- proof-driven goals;
- motivation risks.

Project impact:

Project design should include the right reward loop, autonomy level, feedback cadence, and public/private commitment.

### 5. Thinking

Why it matters:

The assistant should adapt planning and reflection to how the user thinks, learns, and decides.

What to collect:

- strategic versus tactical thinking;
- visual, verbal, written, or action-based processing;
- detail tolerance;
- abstraction level;
- learning style;
- decision errors;
- cognitive overload triggers.

Recommended diagnostics:

- decision journal review;
- learning-history review;
- optional cognitive style self-assessment.

Questions:

- Do I think best by writing, speaking, drawing, or doing?
- Do I need the whole map or the next step?
- Where do I overcomplicate?
- Where do I oversimplify?
- Which decisions do I repeatedly regret?
- What information do I need before starting?
- What information do I use as an excuse not to start?
- How do I learn fastest?
- How do I know that I understand something?
- What should the assistant never assume about my thinking?

What the assistant should extract:

- decision style;
- learning preferences;
- common thinking traps;
- useful planning formats.

Project impact:

Project plans should be shaped as maps, checklists, experiments, essays, or action loops depending on the user's thinking style.

### 6. Emotions

Why it matters:

Emotional patterns often explain missed plans better than logic or discipline.

What to collect:

- frequent emotions;
- triggers;
- anxiety patterns;
- anger patterns;
- avoidance patterns;
- recovery practices;
- emotional decision risks.

Recommended diagnostics:

- emotion diary;
- stress trigger review;
- optional anxiety/stress self-checks without medical conclusions.

Questions:

- What knocks me out of balance quickly?
- How do I behave under pressure?
- Do I attack, freeze, avoid, rationalize, or please?
- Which topics are emotionally loaded?
- What do I call laziness when it may be fear, fatigue, or conflict?
- What helps me return to normal?
- Which decisions should I avoid in a charged state?
- How do I react when I disappoint myself?
- What kind of feedback makes me grow?
- What kind of feedback shuts me down?

What the assistant should extract:

- emotional triggers;
- defensive patterns;
- recovery strategies;
- decision-state warnings.

Project impact:

Projects should include emotional risk handling, especially around visibility, failure, conflict, and uncertainty.

### 7. Behavior

Why it matters:

Behavior shows what the user reliably does, not only what they intend.

What to collect:

- habits;
- procrastination patterns;
- follow-through patterns;
- starts and stops;
- discipline conditions;
- repeated loops;
- planning reliability.

Recommended diagnostics:

- habit inventory;
- project completion review;
- weekly review history.

Questions:

- What scenarios repeat in my life?
- At what stage do I usually abandon projects?
- What do I start easily but not finish?
- What do I delay even when it matters?
- Which environments make me reliable?
- Where should I not rely on willpower?
- What small routines compound well for me?
- What always breaks my routines?
- What makes a plan feel realistic?
- What makes a plan silently impossible?

What the assistant should extract:

- repeated behavior loops;
- failure points;
- habit leverage;
- planning rules.

Project impact:

Projects should be designed around known behavior patterns, not idealized discipline.

### 8. Social Layer

Why it matters:

Many goals depend on people, boundaries, conflict, visibility, and support.

What to collect:

- communication style;
- collaboration style;
- conflict behavior;
- leadership and followership patterns;
- boundaries;
- recognition needs;
- people who strengthen or drain the user.

Recommended diagnostics:

- conflict pattern review;
- team role reflection;
- relationship energy audit.

Questions:

- With what people do I become stronger?
- With what people do I lose myself?
- How do I behave in conflict?
- Where do I fail to set boundaries?
- Do I prefer leading, supporting, analyzing, creating, selling, or managing?
- What kind of team fits me?
- What kind of public visibility is energizing?
- What kind of visibility is draining?
- What do I need from collaborators?
- What should I never delegate?

What the assistant should extract:

- collaboration preferences;
- boundary risks;
- social energy rules;
- project team constraints.

Project impact:

Projects should account for collaboration style, exposure level, and boundary requirements.

### 9. Professional Layer

Why it matters:

The passport should help choose work and projects that fit both identity and market reality.

What to collect:

- skills;
- experience;
- achievements;
- failures;
- market assets;
- professional interests;
- work style;
- money goals;
- career hypotheses.

Recommended diagnostics:

- skills inventory;
- achievement review;
- market positioning review.

Questions:

- What can I already do better than average?
- What have people paid me for or could pay me for?
- Which tasks drain me even if I am good at them?
- Which tasks interest me enough to go deep?
- What kind of work environment accelerates me?
- Am I more founder, expert, operator, creator, strategist, seller, or researcher?
- Which achievements still matter to me?
- Which achievements no longer define me?
- What professional bet am I making now?
- Which skill would change my trajectory most?

What the assistant should extract:

- professional strengths;
- monetizable assets;
- draining competencies;
- career direction hypotheses;
- project-market fit.

Project impact:

Projects should be checked for professional leverage, skill growth, and strategic fit.

### 10. Identity And Narrative

Why it matters:

People often choose goals to defend an old identity or avoid becoming a feared one.

What to collect:

- major life events;
- turning points;
- wins;
- hard periods;
- repeated life themes;
- current identity;
- old identities;
- desired future identity.

Recommended diagnostics:

- life timeline;
- narrative identity reflection;
- major decision review.

Questions:

- Which 5 events shaped me most?
- What role do I usually play in my own story?
- Which old identity have I outgrown?
- Which identity am I still trying to prove?
- Who am I afraid to become?
- What future version of me feels honest?
- What future version feels performative?
- Which goals belong to my old self?
- Which goals are signals from my next self?
- What story about myself should be challenged?

What the assistant should extract:

- identity anchors;
- old-self goals;
- emerging identity;
- narrative traps;
- meaningful direction.

Project impact:

Projects should be checked for whether they serve the user's real future or only defend an outdated self-image.

### 11. Goals And Projects

Why it matters:

This block turns the passport into action.

What to collect:

- active goals;
- project ideas;
- abandoned projects;
- current commitments;
- desired outcomes;
- time and energy budgets;
- success criteria;
- stop criteria.

Recommended diagnostics:

- goal inventory;
- active commitment audit;
- 7-14 day project test design.

Questions:

- Which goals are active now?
- Which goals are mine versus inherited or reactive?
- Which projects have real energy behind them?
- Which projects are attempts to prove something?
- What would make this project worth doing even if it is hard?
- What would make it not worth doing?
- What is the smallest honest test?
- What should be removed before adding this?
- What resource does this project require weekly?
- What is the first visible result?

What the assistant should extract:

- project candidates;
- resource demand;
- fit with values and motivation;
- reasons to start, pause, reshape, or reject;
- experiment design.

Project impact:

Every serious project should pass through a project filter before entering the plan.

### 12. Rules And Contradictions

Why it matters:

Contradictions reveal where growth and bad decisions usually happen.

What to collect:

- repeated internal conflicts;
- decision rules;
- anti-rules;
- project filters;
- unresolved hypotheses;
- known failure modes.

Recommended diagnostics:

- contradiction review;
- decision journal review;
- quarterly passport review.

Questions:

- What do I want that conflicts with another thing I want?
- Where do my behavior and values disagree?
- Where do my ambitions exceed my current resource?
- Which rule would have prevented several bad decisions?
- Which rule would have protected a good decision?
- Which contradiction keeps repeating?
- What should the assistant challenge me on?
- What should the assistant never optimize for blindly?
- Which rule is stable enough to use now?
- Which rule is still only a hypothesis?

What the assistant should extract:

- project filters;
- decision rules;
- contradiction list;
- confidence levels;
- review triggers.

Project impact:

Rules and contradictions are used as final checks before adding or continuing projects.

## Six-Session Protocol

### Session 1. Baseline Profile And Current Life

Goal:

Create the first map of current reality.

Coverage:

- life roles;
- current goals;
- current commitments;
- health and energy baseline;
- work and money baseline;
- relationships and environment;
- major current tensions.

Output:

- initial passport skeleton;
- missing-data map;
- first list of active goals and commitments.

### Session 2. Personality, Temperament, And Energy

Goal:

Understand the user's operating conditions.

Coverage:

- body and energy;
- temperament;
- stress and recovery;
- preferred planning conditions.

Output:

- energy map;
- planning constraints;
- early rules for workload and recovery.

### Session 3. Values, Motivation, And Meaning

Goal:

Identify what makes goals feel alive and what makes success empty.

Coverage:

- values;
- anti-values;
- motivation;
- acceptable compromises;
- proof-driven goals.

Output:

- value hierarchy;
- motivation map;
- anti-value list;
- first project filters.

### Session 4. Behavior, Emotions, And Patterns

Goal:

Find the user's actual loops, not only their intentions.

Coverage:

- emotional triggers;
- habit patterns;
- procrastination;
- follow-through;
- repeated failures and successes.

Output:

- repeated pattern list;
- failure points;
- recovery rules;
- behavior-aware planning rules.

### Session 5. Profession, Skills, And Projects

Goal:

Connect personality with market reality and active projects.

Coverage:

- skills;
- experience;
- professional assets;
- current and possible projects;
- project-market fit.

Output:

- professional map;
- project candidates;
- project filters;
- 7-14 day experiments.

### Session 6. Life Strategy And Decision Rules

Goal:

Convert the passport into rules for future choices.

Coverage:

- contradictions;
- long-term direction;
- rules for saying yes/no;
- current project portfolio;
- review cadence.

Output:

- personal passport v1;
- decision rules;
- contradiction list;
- project portfolio recommendations;
- open hypotheses for the next month.

## Extraction Rules

After each session, the assistant should:

- split raw answers into structured extracted items;
- classify each item by type;
- assign confidence;
- link it to one or more personality blocks;
- note its impact on goals and projects;
- ask follow-up questions only for important missing or conflicting data;
- preserve contradictions instead of resolving them prematurely.

The assistant should not:

- turn a single answer into a permanent identity label;
- treat test results as final truth;
- infer medical or psychiatric diagnoses;
- optimize only for productivity;
- silently overwrite user-confirmed rules.

## Project Filter

Every serious project should be evaluated with this structure:

```text
Name:
Related values:
Motivation source:
Required weekly energy:
Required time:
Required social exposure:
Required uncertainty tolerance:
Professional leverage:
Main risks for me:
Conditions for success:
Signs this project is not mine:
Smallest 7-14 day test:
Decision: take | postpone | reshape | reject
Reason:
Confidence: low | medium | high
```

Decision meanings:

- `take`: start or continue the project as designed.
- `postpone`: the project may fit, but timing or resource is wrong.
- `reshape`: the direction fits, but format, scope, team, or rhythm should change.
- `reject`: the project conflicts with values, resource, identity, or strategic direction.

## Passport Review Cadence

Daily:

- capture state, energy, important thoughts, and notable friction.

Weekly:

- review active goals, missed plans, energy patterns, and project fit.

Monthly:

- update project filters, decision rules, and open hypotheses.

Quarterly:

- review values, identity, professional direction, and major contradictions.

## Scenarios For Validation

- Chaotic self-description is sorted into blocks and missing areas are marked.
- A new project is checked against values, motivation, energy, professional leverage, and risks.
- Too many goals trigger a resource conflict and a recommendation to narrow focus.
- A values session extracts values, anti-values, compromises, and project constraints.
- Contradictory answers are saved as contradictions or hypotheses, not smoothed over.
- Sparse data results in low confidence and targeted follow-up questions.

