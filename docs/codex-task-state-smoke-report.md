# Task State Smoke Test

## Что изменилось

- Создание, изменение и сериализация задачи вынесены в `public/task-state.js`.
- Актуальный интерфейс использует этот модуль при создании, редактировании, сохранении и загрузке состояния.
- Добавлен быстрый `node:test` сценария `создать -> изменить -> сериализовать -> восстановить`.
- `npm run check` теперь запускает smoke test автоматически.

## Файлы

- `public/task-state.js`
- `public/app.js`
- `scripts/task-state-smoke.test.mjs`
- `scripts/reliability-check.mjs`
- `package.json`
- `public/index.html`
- `public/sw.js`

## Проверки

```text
npm run check
git diff --check
```

Результат: 2 теста пройдены, 0 ошибок. Полный браузерный аудит намеренно не запускался: этот срез проверяет только контракт хранения задачи и экономит недельный лимит.
