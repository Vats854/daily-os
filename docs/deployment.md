# Deployment Sketch

## Revision-safe state sync

Run the current version of:

```text
db/supabase-state-sync.sql
```

It adds a monotonic `revision` to `daily_os_states` and installs the atomic
`save_daily_os_state` function. The PWA sends the revision it last loaded; the
database rejects stale phone/laptop writes instead of silently accepting the
last request.

The frontend deliberately refuses cloud writes before this SQL upgrade. Local
changes remain on the current device and the app shows an actionable setup
message. This is safer than an unconditional legacy upsert that could overwrite
newer phone or laptop data.

On a conflict the browser stores the unsaved local snapshot and revision metadata
under `second-brain-command-center:conflict-backup`, loads the newer cloud state,
and asks whether to keep the cloud version or explicitly restore the local one.
No further cloud writes run while that choice is unresolved.

## Normalized Notes storage

After the base state sync is working, run the entire file below in Supabase SQL Editor:

```text
db/content-schema.sql
```

It creates private, user-owned `note_folders` and `notes` tables with RLS. No new
Vercel environment variables are required. Deploy the current `main` branch after
applying the SQL.

The rollout is backward-compatible: before the SQL is applied, Notes remain in
`daily_os_states`; after the tables are available, the first signed-in load copies
existing folders and notes into the normalized tables automatically.

## Recommended VPS

Use the 4 GB RAM / 50 GB disk VPS. It leaves enough room for the PWA/API service, Postgres, a worker, reverse proxy, logs, backups, and swap.

The 2 GB plan can run the prototype, but it leaves little room for Postgres, background jobs, and LLM-side processing.

## Services

```text
vps
├─ caddy or nginx
├─ second-brain-app
│  ├─ pwa frontend
│  └─ api
├─ second-brain-worker
│  ├─ morning planning
│  ├─ evening review
│  ├─ weekly review
│  └─ inbox processing
├─ postgres
├─ calendar-sync-readonly
└─ backups
```

## Isolation Rules

- Run app, worker, and Postgres as separate Docker services.
- Give each service a separate `.env`.
- Use separate ports.
- Keep separate persistent volumes.
- Put all public traffic through one reverse proxy.
- Keep calendar credentials available only to the read-only sync service or worker.

## Environment Variables

```text
APP_BASE_URL=
DATABASE_URL=postgres://second_brain:password@postgres:5432/second_brain
USER_TIMEZONE=Europe/Moscow
LLM_PROVIDER=
LLM_API_KEY=
ICLOUD_USERNAME=
ICLOUD_APP_PASSWORD=
ICLOUD_CALENDAR_URL=
CALENDAR_WRITE_ENABLED=false
```

## Calendar Notes

Apple Calendar sync should use iCloud CalDAV with an app-specific password.

MVP policy is read-only:

- import external event ids;
- store event windows as constraints;
- never create, update, or delete calendar events;
- keep `CALENDAR_WRITE_ENABLED=false`.

The calendar UI uses the FullCalendar global bundle from jsDelivr. The first
online load caches the asset through the existing service worker. Internal Daily
OS blocks are editable; imported calendar events must be created with
`editable: false` until write-back is explicitly enabled.

## Backup Plan

For Postgres MVP:

- Nightly `pg_dump`.
- Keep 7 daily backups and 4 weekly backups.
- Back up `.env` separately in a secure place, not in git.
