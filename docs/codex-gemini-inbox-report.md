# Codex Gemini Inbox Report

Date: 2026-07-08

## What Changed

- Added server-side Daily OS AI endpoint:
  - `POST /api/ai/inbox`
  - reads `GEMINI_API_KEY` and `GEMINI_MODEL` from `.env`
  - sends only a small Daily OS context summary plus the incoming text
  - returns normalized parsed inbox data for the frontend
- Added Gemini inbox parsing schema/prompt:
  - `task`
  - `note`
  - `idea`
  - `plan_change`
  - `health_signal`
  - `project`
  - `daily_context`
- Wired frontend inbox processing to the endpoint:
  - Inbox form and Today quick inbox now call `processInbox()` asynchronously
  - `processInbox()` tries `/api/ai/inbox` first
  - if Gemini/server fails, it falls back to the old local classifier
  - fallback adds an `AI fallback` action with `needs_review`
- Made server `.env` loading safer:
  - explicit env vars now override `.env`, so `PORT=4274 npm run dev` works for testing
- Updated `.env.example`:
  - added `AI_PROVIDER=gemini`
- Bumped frontend assets:
  - `styles.css?v=66`
  - `app.js?v=66`
  - service worker cache `second-brain-command-center-v66`

## Why

The MVP needs a real assistant path, but the API key must stay server-side. This change keeps Gemini out of `public/*` and makes the frontend call only our own `/api/ai/inbox` endpoint.

The local classifier remains as resilience, so the app still works when Gemini is unavailable.

## Files Edited

- `server.js`
- `public/app.js`
- `public/index.html`
- `public/sw.js`
- `.env.example`

## Checks Run

```bash
node --check public/app.js
node --check public/sw.js
node --check server.js
npm run check
```

All passed.

## Runtime Verification

Started the project server on a temporary port:

```bash
PORT=4274 npm run dev
```

Health check:

```json
{
  "ok": true,
  "app": "Second Brain Command Center",
  "mode": "pwa-first-mvp",
  "dailyAi": "gemini",
  "careerAi": "gemini"
}
```

Gemini endpoint test reached Google, but Google rejected the current key:

```json
{
  "status": 400,
  "reason": "API_KEY_INVALID",
  "message": "API key not valid. Please pass a valid API key."
}
```

The key value was not printed.

## Current Blocker

The `.env` file has `GEMINI_API_KEY` set, but Google says it is not a valid Gemini API key for `generativelanguage.googleapis.com`.

Replace it with a fresh key from:

```text
https://aistudio.google.com/app/apikey
```

Then restart the server and test again.

## Remaining Risks

- The current Gemini endpoint uses JSON mode plus prompt/schema instructions. It no longer sends strict `responseSchema` because the first test needed to distinguish schema errors from key errors.
- The app still stores state in localStorage. Gemini parsing is now real server-side AI, but persistence/sync still needs the next MVP step.
