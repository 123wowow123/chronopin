---
name: admin-login-refresh
description: >-
  Use this skill when an admin API call answers 401, a saved admin token in .scrape has expired (they last
  about 2-5 hours), or before any job step that PUTs through the authenticated admin APIs (event-info
  checkedAt, restaurant content, rubric saves, translations). It signs in from .env.local and refreshes the
  prod and local token files without printing them.
---

# Refresh the admin login

Run this instead of asking the owner for a password or hunting for a login script (there is no
`admin_login.py` in the repo).

```bash
.agents/skills/admin-login-refresh/scripts/refresh_admin_login.sh        # prod and local
.agents/skills/admin-login-refresh/scripts/refresh_admin_login.sh prod   # or: local
```

It prints one line per environment, for example `prod: token saved to .scrape/admin.token (admin check HTTP 200)`.

## What it does

- Reads `ADMIN_PASSWORD` from `.env.local`; the admin email is `flynni2008@gmail.com`.
- `POST /auth/local`, then takes the token from the **`Set-Cookie: token=` header** (the JSON body has no token).
- Writes `.scrape/admin.token` (production, `https://www.chronopin.com`) and `.scrape/admin-local.token`
  (`http://localhost:3000`) with mode 600, and checks them with `GET /api/admin/db`.
- Keeps the files afterwards: other sessions reuse them. Do not delete them.

## Using the token

```bash
T=$(cat .scrape/admin.token)
curl -s -X PUT -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d "$BODY" \
  https://www.chronopin.com/api/pins/$ID/event-info
```

## Rules and traps

- **Never print, log or paste a token or the password**, and send the production token only to
  www.chronopin.com. Read it into a variable (`T=$(cat ...)`) and do not `echo` the variable.
- Loops in zsh do not word-split unquoted variables: `set -- $E` leaves `$1` as the whole string. Pass URL and
  token as separate function arguments instead.
- A 401 on a PUT with a token that GETs fine means the token has expired: refresh and retry.
- No `ADMIN_PASSWORD` in `.env.local`, or "sign-in failed": ask the owner; do not guess passwords or create
  accounts.
- If production is unreachable, run `local` only and report production as not saved.

## Full job flow (news run, learned 2026-11-03)

Where the login fits in a 06:00 / 18:00 run (details: `run-news-job`, `daily-news-job`, `docs/okf/scraping/daily-jobs.md`):

1. Read the slot's run note first; an open run is continued, never restarted. Check `localhost:3000` is up
   (`npm run dev`, one instance); many steps (PinGang handoff, local readbacks) need it.
2. Refresh the logins (`refresh_admin_login.sh`) before any step that PUTs through admin APIs. A 401 means refresh and
   retry. Never print or delete the token files.
3. Work the lanes in order (maintenance, event info, markets, scores, ads and products), in parallel agents if wanted;
   agents report, the main session writes the run note.
4. Local-only saves are pushed to prod by hand when a tool does not: match the prod pin by `sourceUrl`
   (`/api/admin/db/Pin?sourceUrl=...`; ids usually agree but check), then `PUT /api/pins/:id/<endpoint>` or
   `POST /api/admin/db/<Table>?upsert=1`, then GET to verify. Since 2026-11-03 the factory, model, blurb and
   horoscope tools push by themselves (reconnect `chronopin` in `/mcp` after code changes).
5. Horoscope keys must come from prod's users and charts (`horoscopes_needed` reads them when the run writes to prod).
   To check the result as a user, GET `/api/horoscope/me` on prod with the admin token; do not forge other users' sessions.
6. Write `docs/okf/scraping/news-YYYY-MM-DD-{am,pm}.md`, run `npx vitest run src/lib/okfLint.test.ts`, list every open lane,
   then close with `npm run jobs:run -- --finish <id> --report <file>` only when the whole run is worked or each gap is named.
7. Deploy only when the user asks in words (`deploy-production`); a job run is content maintenance.
