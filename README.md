# Jindo

Personal command-driven ops assistant for **Junaid Khan** (timezone `Asia/Karachi`).

Jindo is a single-user, mobile-first **PWA** chat UI that talks to:

- **monday.com** — boards, tasks, assignments, overdue/stale, progress reports
- **httpSMS** — SMS only when you explicitly say *text / notify / send*
- **Google Calendar** — upcoming events and create meetings

If API keys are missing, the app runs in **Demo mode** with obviously fake fixtures and a banner: *Demo mode — add keys in .env to go live.*

> **This repository is intended to be PUBLIC** (`https://github.com/junaid634/jindo-assistant`).  
> Never commit secrets, API tokens, real employee phone numbers, or live credentials. Use `.env` locally (gitignored) and `.env.example` as the template.

## Prerequisites

- **Node.js 20+** and npm
- Copy `.env.example` to `.env` before going live (demo mode works with an empty `.env`)
- For live mode: a monday.com API token, httpSMS API URL/key, and Google Calendar credentials (see below)
- Never commit `.env`, tokens, or real employee phone numbers (this repo is public)

## Quick start

```bash
cd jindo-assistant
cp .env.example .env   # optional — works without keys in demo mode
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build    # production build
npm start        # serve production build
npm test         # vitest unit tests
```

## Environment variables

See `.env.example` for the full list:

| Variable | Purpose |
| --- | --- |
| `ASSISTANT_PIN` | Optional PIN gate (skip if unset) |
| `ASSISTANT_USER_NAME` | Display name (default Junaid Khan) |
| `ASSISTANT_TIMEZONE` | Default `Asia/Karachi` |
| `MONDAY_API_TOKEN` | monday.com API token |
| `MONDAY_DEFAULT_BOARD_ID` | Optional default board |
| `MONDAY_API_URL` | Default `https://api.monday.com/v2` |
| `MONDAY_PERSON_COLUMN_ID` | People column id (default `person`) |
| `MONDAY_STATUS_COLUMN_ID` | Status column id (default `status`) |
| `MONDAY_DATE_COLUMN_ID` | Date column id (default `date`) |
| `HTTPSMS_BASE_URL` | httpSMS base URL (no trailing slash) |
| `HTTPSMS_API_KEY` | `x-api-key` header value |
| `HTTPSMS_FROM_NUMBER` | E.164 `from` number |
| `GOOGLE_CALENDAR_ID` | Calendar id |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Path to service account JSON (**option A**) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | OAuth refresh flow (**option B**) |
| `OPENAI_API_KEY` | Optional LLM intent parsing |
| `OPENAI_BASE_URL` / `OPENAI_MODEL` | OpenAI-compatible endpoint |

### monday.com

1. Create a personal API token at [monday Developer](https://developer.monday.com/).
2. Set `MONDAY_API_TOKEN` and optionally `MONDAY_DEFAULT_BOARD_ID`.
3. If your board uses custom column IDs, set `MONDAY_*_COLUMN_ID` overrides.
4. GraphQL uses documented fields: `boards`, `items_page`, `change_multiple_column_values` (people via `personsAndTeams`).

### httpSMS

Docs: [https://docs.httpsms.com/](https://docs.httpsms.com/)

```http
POST {HTTPSMS_BASE_URL}/v1/messages/send
x-api-key: {HTTPSMS_API_KEY}
{ "from": "...", "to": "...", "content": "..." }
```

Jindo **never** sends SMS unless the command explicitly says notify/text/send. Outbound messages are logged in the chat thread.

Employee phones live in `data/employees.json` and must stay clearly fake in this public repo (e.g. `+1555010xxxx`).

### Google Calendar auth (chosen approach)

**Preferred for a server-side single-user app: service account (option A).**

1. Create a Google Cloud service account with Calendar API enabled.
2. Download the JSON key; store it **outside** the repo (or gitignored path).
3. Set `GOOGLE_SERVICE_ACCOUNT_JSON=/absolute/path/to/sa.json`.
4. Share the target calendar with the service account email (edit access).
5. Set `GOOGLE_CALENDAR_ID` (often your email, or the calendar’s id).

**Option B — OAuth refresh token:** set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN` instead of the service account path. Useful if you cannot share a calendar with a service account.

### Optional LLM

If `OPENAI_API_KEY` is set, Jindo uses an OpenAI-compatible chat completion to parse intent. Otherwise a robust keyword parser runs (zero LLM required).

## PWA install (Android Chrome)

1. Deploy or tunnel the app over **HTTPS** (Chrome requires a secure context except localhost).
2. Open the site in Chrome → browser menu → **Install app** / **Add to Home screen**.
3. Manifest: `/manifest.webmanifest`. Service worker: `/sw.js`.

## Example commands

- `assign Prepare weekly ops digest to Ali`
- `today's report`
- `text Ali his tasks`
- `what's on the calendar`
- `schedule a meeting about vendors tomorrow at 3pm`
- `overdue tasks`
- `list boards`
- `help`

## Out of scope (v1)

WhatsApp, Meta ads, native APK, multi-user auth, Gmail. Do not expect ads metrics.

## Stack

- Next.js App Router + TypeScript + Tailwind
- Vitest for command parsing and client wrapper tests (mocked network)

## License

MIT — see `LICENSE`.
