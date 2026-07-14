# Board And Capture Actions Update

## What changed

- Renamed inbox submit actions from vague `Разобрать` to clearer save actions.
- Today quick inbox now explains that it saves text and shows where it landed.
- Capture receipt now says `Запись сохранена как ...`.
- Board cards now have visible actions: `Назад`, `В Сегодня`, `Дальше`, `Вернуть`.
- Board actions update task status, select the task, write an assistant log event, and save state.
- Translated board-visible status and priority labels where they appear on cards.
- Bumped assets to `v83` and service worker cache to `second-brain-command-center-v83`.

## Why

The board was mostly passive, and the inbox action did not explain what happened to a note. The MVP must show cause and effect immediately after user input.

## Files edited

- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/sw.js`

## Remaining risks

- Board still does not support drag-and-drop. The current fix makes it operational through explicit buttons.
- Inbox auto-classification may still surprise the user, but the receipt now makes the result visible.
