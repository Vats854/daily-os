# Data Model

This is the Postgres-friendly model for the PWA-first MVP. The app should treat Postgres as the source of truth and keep all assistant changes auditable.

## Tables

### users

- `id`
- `email`
- `timezone`
- `morning_planning_time`
- `evening_review_time`
- `created_at`
- `updated_at`

### areas

- `id`
- `user_id`
- `key`
- `title`
- `color`
- `created_at`

MVP `key` values:

- `work`
- `personal`
- `health`

### projects

- `id`
- `user_id`
- `area_id`
- `title`
- `status`
- `progress`
- `journey_stage`
- `journey_status`
- `stage_reason`
- `next_transition`
- `last_stage_review_at`
- `created_at`
- `updated_at`

Suggested `journey_stage` values:

- `call`
- `commitment`
- `preparation`
- `trial`
- `crisis`
- `result`
- `integration`

### project_stage_events

- `id`
- `project_id`
- `from_stage`
- `to_stage`
- `reason`
- `evidence`
- `proposed_by`
- `status`
- `created_at`

Assistant-proposed events must start as `needs_confirmation`.

### project_obstacles

- `id`
- `project_id`
- `type`
- `text`
- `severity`
- `status`
- `source_type`
- `source_id`
- `created_at`

### tasks

- `id`
- `user_id`
- `project_id`
- `area_id`
- `title`
- `description`
- `status`
- `priority`
- `estimated_minutes`
- `due_date`
- `needs_review`
- `created_by`
- `created_at`
- `updated_at`

Suggested `status` values:

- `inbox`
- `backlog`
- `this_week`
- `today`
- `done`

### daily_plans

- `id`
- `user_id`
- `plan_date`
- `focus`
- `status`
- `energy`
- `review_summary`
- `created_at`
- `updated_at`

Suggested `status` values:

- `steady`
- `low_energy`
- `overloaded`

### weekly_plans

- `id`
- `user_id`
- `week_start`
- `focus` as JSON
- `review_summary`
- `created_at`
- `updated_at`

### notes

- `id`
- `user_id`
- `area_id`
- `type`
- `text`
- `source_inbox_item_id`
- `created_at`

Suggested `type` values:

- `note`
- `idea`
- `health_signal`
- `daily_context`
- `learning`

### inbox_items

- `id`
- `user_id`
- `raw_text`
- `parsed_kind`
- `parsed_payload`
- `status`
- `created_at`

### calendar_events

- `id`
- `user_id`
- `external_calendar_id`
- `external_event_id`
- `title`
- `starts_at`
- `ends_at`
- `source`
- `created_at`

Calendar events are read-only constraints in MVP.

### assistant_actions

- `id`
- `user_id`
- `inbox_item_id`
- `action_type`
- `target_type`
- `target_id`
- `summary`
- `reason`
- `status`
- `created_at`

Suggested `status` values:

- `confirmed`
- `needs_review`
- `reverted`

### memory_items

- `id`
- `user_id`
- `key`
- `text`
- `confidence`
- `source_type`
- `source_id`
- `created_at`
- `updated_at`

## Memory Strategy

The prompt context should be assembled from:

- Today's plan and top tasks.
- Weekly plan and carry-over tasks.
- Recent assistant actions.
- Recent notes and memory items.
- Read-only calendar load.
- Relevant Personal Passport facts, hypotheses, rules, contradictions, and project filters when needed.

The assistant should keep compact operational memory like:

```text
User prefers learning blocks in the evening except on sport days.
Sport is Monday, Wednesday, Friday.
Recovery time is valid and should be planned explicitly.
```

## SQL Schema

See `db/schema.sql`.

## Personal Passport Extension

The Personal Passport can start as summarized memory, but the future automated version should store extracted items separately from raw messages and reviews.

### passport_blocks

- `id`
- `user_id`
- `key`
- `title`
- `summary`
- `completion_level`
- `confidence`
- `created_at`
- `updated_at`

Suggested `key` values:

- `body_energy`
- `temperament`
- `values`
- `motivation`
- `thinking`
- `emotions`
- `behavior`
- `social`
- `professional`
- `identity`
- `goals_projects`
- `rules_contradictions`

### passport_items

- `id`
- `user_id`
- `block_id`
- `type`
- `text`
- `source_type`
- `source_id`
- `confidence`
- `project_impact`
- `check_next`
- `status`
- `created_at`
- `updated_at`

Suggested `type` values:

- `fact`
- `observation`
- `self_description`
- `hypothesis`
- `conclusion`
- `rule`
- `contradiction`

Suggested `status` values:

- `draft`
- `confirmed`
- `superseded`
- `rejected`

### project_filters

- `id`
- `user_id`
- `goal_id`
- `name`
- `related_values`
- `motivation_source`
- `required_weekly_energy`
- `required_time_minutes`
- `required_social_exposure`
- `required_uncertainty_tolerance`
- `professional_leverage`
- `main_risks`
- `conditions_for_success`
- `not_mine_signs`
- `smallest_test`
- `decision`
- `reason`
- `confidence`
- `created_at`
- `updated_at`

Suggested `decision` values:

- `take`
- `postpone`
- `reshape`
- `reject`
