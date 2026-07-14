# Notes content foundation

## What changed

- Added user-owned note folders with `All notes` and `Unfiled` system views.
- Rebuilt Notes as a four-part workspace: module rail, folder library, document list, and wide editor.
- Added note creation, selection, folder moves, titles, long-form body text, tags, timestamps, search, and deletion.
- Migrated legacy notes from their old `area` value into compatible note folders during state normalization.
- Added a normalized Supabase schema for `note_folders` and `notes` with indexes and RLS policies.
- Documented the hybrid migration policy: the current JSON snapshot remains the compatibility source while normalized tables are introduced domain by domain.

## Why

Tasks and notes have different jobs. Today answers what to do now; Notes stores durable context and long-form material. The previous narrow inspector did not support reading, writing, or understanding where a note was saved.

## Files edited

- `public/app.js`
- `public/task-core.css`
- `public/index.html`
- `public/sw.js`
- `docs/data-model.md`
- `db/content-schema.sql`

## Checks run

- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Browser verification

- URL: `http://127.0.0.1:4174/?fresh=99`
- Desktop viewport: 1280 x 720.
- Horizontal page overflow: false.
- Document list width: 320 px.
- Editor width: 684 px.
- Created a folder and long-form note, edited body and tags, reloaded, and confirmed persistence.
- Mobile browser emulation could not be completed because the browser session blocked further access to the local address. Responsive CSS was reviewed, but this remains a manual verification item.

## Remaining risks

- `db/content-schema.sql` is prepared but not yet applied to Supabase or wired as the authoritative content API.
- Notes still sync inside the existing `daily_os_states` JSON snapshot for compatibility.
- Attachments, nested folders, Markdown rendering, backlinks, and version history are intentionally outside this slice.
- Calendar layout, habit visualization, and the next appearance pass should be separate slices so they do not destabilize the task and note foundations.
