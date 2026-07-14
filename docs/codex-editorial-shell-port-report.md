# Editorial Shell Port

## Что изменилось

- Выбранная концепция `Editorial + Sage + Clean` перенесена в активный `simple-app` основного приложения.
- Глобальная навигация разделена на два уровня:
  - module rail: Tasks, Calendar, Habits, Focus, Notes, Search;
  - sidebar выбранного модуля.
- Внутри Tasks сохранены системные представления, а пользовательские списки сгруппированы в области `Работа`, `Личное`, `Здоровье`.
- Списки получили сохраняемые поля `group`, `icon`, `tone`; старые JSON-состояния дополняются ими при нормализации.
- В меню списка можно переименовать список, выбрать иконку, цвет или удалить его.
- Calendar, Habits, Focus и Notes открываются как отдельные рабочие поверхности.
- Calendar в текущем MVP остаётся read-only.
- Рядом с названием Daily OS добавлена сохраняемая настройка оформления:
  - палитры `Sage`, `Sky`, `Clay`;
  - шрифтовые режимы `Clean`, `Soft`, `Editorial`.
- Обновлены asset versions и service worker cache до `v97`.

## Почему

Модули продукта не должны смешиваться со списками задач. Task views и пользовательские списки принадлежат Tasks, а календарь, привычки, фокус и заметки являются отдельными режимами работы.

## Файлы

- `public/index.html`
- `public/app.js`
- `public/task-core.css`
- `public/sw.js`
- `public/icons/calendar-days.svg`
- `public/icons/circle-check-big.svg`
- `public/icons/timer.svg`
- `docs/data-model.md`

## Проверки

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`
- Browser: module rail содержит шесть доступных команд.
- Browser: Calendar, Habits, Focus и Notes открывают отдельные заголовки/поверхности.
- Browser: задача открывает detail pane; при viewport 1280px main = 520px, detail = 464px.
- Browser: смена иконки списка сохраняется и меняет asset в sidebar.
- Desktop horizontal overflow: `false`.
- После appearance pass повторно выполнены синтаксические проверки и `git diff --check`; визуальная browser-проверка v97 не выполнялась из-за ограничения текущей browser-сессии.

## Ограничения

- Точный mobile viewport screenshot не удалось получить из browser viewport override; адаптивные правила проверены только статически.
- Calendar использует существующие read-only события и пока не подключает внешний календарь.
- Areas пока являются фиксированными группами; пользователь редактирует вложенные списки.
