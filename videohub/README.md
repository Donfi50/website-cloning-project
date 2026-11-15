# VideoHub

A video-sharing site starter. Next.js (App Router) + Postgres (Prisma) + S3-compatible storage (MinIO locally) + an ffmpeg worker
that turns uploads into streamable HLS.

**Included:** accounts with email verification and password reset, upload and playback, browse/search/tags/sorting/pagination,
likes, comments, playlists, view counting, reports, moderator tools (removals with emailed reasons, suspensions, roles, bulk removal,
restore, appeals, audit log with CSV export), rate limiting, legal-page templates, account export and deletion, a storage cleanup job,
light and dark themes.

## Run it locally

Needs Node 20.12+, Docker Desktop (running) and ffmpeg.

```bash
cp .env.example .env            # then set AUTH_SECRET:  node -p "require('crypto').randomBytes(32).toString('base64')"
npm ci
docker compose up -d            # Postgres + MinIO
npx prisma migrate dev --name init
npm run dev                     # app on http://localhost:3000
npm run worker                  # in a second terminal: processes uploaded videos
```

After the first `migrate dev`, commit the new `prisma/migrations/` folder so everyone gets the same tables.

No email provider is configured by default: the verification and reset links print in the `npm run dev` terminal. To become an admin,
register, then run `npx prisma studio` and set your user's `role` to `ADMIN`.

## Run it in GitHub Codespaces

GitHub stores the code; **Codespaces** is the part that runs it, in a cloud copy of this repo.

1. On the repo page: **Code → Codespaces → Create codespace on main**. It installs everything, starts Postgres and MinIO and creates the tables (a few minutes).
2. In the terminal: `npm run dev`, and in a second terminal `npm run worker`.
3. In the **Ports** tab, right-click port **9000** and set **Port Visibility → Public**. Video uploads and playback need it: your browser talks to storage directly.
4. Open port 3000's address from the Ports tab.

Notes: this setup is untested on Codespaces. Port 9000 is public, so the script gives the storage a random password instead of the default,
but treat a Codespace as a throwaway demo, not a place for real users or data. Stop it when you're done (free plans have limited hours).

## GitHub Actions

`.github/workflows/ci.yml` runs on every push: install, generate the Prisma client, create the tables in a real Postgres, type-check and
run a production build. A green check means the schema and code compile; it does not run the app or the browser test.

## Configuration

See `.env.example`. The important ones:

| Variable | What it does |
|---|---|
| `DATABASE_URL` | Postgres connection |
| `AUTH_SECRET`, `AUTH_TRUST_HOST`, `AUTH_URL` | Sign-in. `AUTH_TRUST_HOST=true` is required outside Vercel; set `AUTH_URL` to your public address when deployed |
| `APP_URL` | Public address, used in emails and the sitemap |
| `S3_*`, `NEXT_PUBLIC_CDN_URL` | Storage. `S3_PUBLIC_ENDPOINT` only if the browser reaches storage at a different address than the server |
| `SMTP_*`, `MAIL_FROM` | Real email (otherwise links print in the terminal) |
| `UPSTASH_REDIS_*` | Rate limits and view de-duplication across servers (in-memory otherwise) |
| `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_COPYRIGHT_AGENT` | Shown on the legal pages |

## Scripts

- `npm run dev` / `npm run build` / `npm start`
- `npm run worker` transcoding worker (keep it running)
- `npm run cleanup` dry run of the storage cleanup; `npm run cleanup -- --apply` deletes
- Browser test (optional): `npm i -D @playwright/test`, install Google Chrome, then `npx playwright test`

## Before real users

Read `PRELAUNCH.md`. The terms, privacy and takedown pages are **templates with [placeholders]**: fill them in and have a lawyer review them.
Add a LICENSE file of your choice (none is included).
