# Today visual foundation and themes

## What changed

- Rebuilt the Today visual hierarchy around one compact task workspace instead of a large form-like canvas.
- Kept only list and priority as lightweight composer defaults on Today; date and Today status are implied by the screen.
- Normalized task rows into a stable title + inline metadata pattern.
- Added appearance modes: System, Light, and Dark.
- Added independent accent choices: Blue, Green, and Amber.
- Kept the existing Clean, Soft, and Editorial typography choices.
- Fixed mobile task rows so task titles, metadata, plan action, and menu stay in one readable 58px row.
- Increased dark-mode secondary-text contrast.

## Why

The previous Today view looked like a configuration form: four equally prominent selects competed with the actual task list, duplicate Today values added noise, and metadata stacked vertically. The new layout makes the task list the primary object and treats defaults as secondary controls.

## Files edited

- `public/app.js`
- `public/index.html`
- `public/task-core.css`
- `public/sw.js`
- `docs/stages/today-visual-foundation-themes.md`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

All checks passed, including 13 task-state tests.

## Browser verification

Route: `http://127.0.0.1:4174/?fresh=160`

Desktop at 1280x720:

- page overflow: false
- main panel width: 984px
- task list width: 915px
- composer width: 820px
- task row height: 54px
- inspector visible without selection: false

Mobile at 390x844:

- page overflow: false
- task row height: 58px
- task copy column: 243px
- drag handle hidden: true
- task title and metadata fit: true

Light and dark themes were both checked in the browser. Appearance choices persist through the existing state save path.

## Remaining risks

- Some less-used secondary screens still contain older hard-coded hover colors and can be migrated to semantic theme tokens in a later visual pass.
- The theme picker remains a compact popover; a dedicated settings screen may become useful once there are more personal preferences.
