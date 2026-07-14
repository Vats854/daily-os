# Normalized Notes sync

## What changed

- Added Supabase repository functions for loading and saving note folders and notes.
- Added automatic first-run migration from the compatibility JSON snapshot.
- Added `settings.notesNormalizedAt` to distinguish an uninitialized table from an intentionally empty library.
- Made normalized Notes content override snapshot Notes when cloud rows exist.
- Added create/update/delete reconciliation scoped by the authenticated user and RLS.
- Preserved local and snapshot fallback when content tables do not exist yet.
- Changed content keys to `(user_id, id)` text composites so client-generated IDs migrate without remapping links or colliding across users.

## Files edited

- `public/supabase-client.js`
- `public/app.js`
- `db/content-schema.sql`
- `docs/data-model.md`
- `docs/deployment.md`
- `public/index.html`
- `public/sw.js`

## Checks run

- `node --check public/supabase-client.js`
- `node --check public/app.js`
- `node --check public/sw.js`
- `node --check server.js`
- `npm run check`
- `git diff --check`

## Activation

Run `db/content-schema.sql` in the Supabase SQL Editor, then deploy app asset version 100.

## Remaining risks

- The normalized schema cannot be exercised locally without an authenticated Supabase project where the SQL has been applied.
- The compatibility snapshot still contains Notes during migration; normalized rows win on load.
- Large binary attachments are not part of this schema and should later use a private Storage bucket.
