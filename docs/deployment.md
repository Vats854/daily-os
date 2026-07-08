# Deployment Sketch

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

## Backup Plan

For Postgres MVP:

- Nightly `pg_dump`.
- Keep 7 daily backups and 4 weekly backups.
- Back up `.env` separately in a secure place, not in git.
