# Pre-launch checklist

The legal pages (/terms, /privacy, /copyright) are templates, not legal advice. Every [bracketed placeholder]
must be filled in, and a lawyer familiar with your jurisdiction should review them before launch.

## Legal and safety
- [ ] Replace all [placeholders] in app/terms, app/privacy, app/copyright and set the NEXT_PUBLIC_* env vars.
- [ ] US operators: register a designated DMCA agent with the US Copyright Office (dmca.copyright.gov) to qualify
      for safe-harbor protection, and keep the registration current.
- [ ] US operators: providers that learn of apparent child sexual abuse material have a legal duty to report it to
      NCMEC's CyberTipline (18 U.S.C. 2258A). Decide who monitors the moderation queue and how reports are escalated.
- [ ] Decide your minimum age and update the terms and privacy pages to match.
- [ ] If you have EU/UK users: confirm GDPR/UK GDPR obligations (lawful basis, processors, data-subject requests).

## Features still missing that the policies promise or imply
- [x] Account deletion and data export (self-service at /account). Decide whether you must keep moderation records for abusive content after the uploader deletes their account; today those records are deleted with the account.
- [x] Email notification to uploaders when a moderator removes a video (reason required, stored for appeals).
- [x] Audit log of moderator actions (/admin/audit) and admin-only role management (/admin/users).
- [ ] Someone must read the contact inbox and handle appeals. Write down how you review them and how fast.

## Operations
- [ ] HTTPS everywhere; set APP_URL to the real https:// address; use a strong AUTH_SECRET.
- [ ] Upstash Redis configured (the in-memory rate limiter is not reliable on serverless).
- [ ] Real SMTP provider with SPF/DKIM set up on your sending domain.
- [ ] Storage bucket: private raw/ folder, public-read only for videos/, CDN in front, delete permission for the app.
- [ ] Database backups and a tested restore.
- [ ] Error monitoring and a way to watch the transcode worker (restart on crash, alert on a growing queue).
- [x] Cleanup script written (scripts/cleanup.ts). Still to do: schedule `npm run cleanup -- --apply` daily and look at a dry-run report first.
- [ ] Run the full smoke test in SETUP.md against a staging deployment.
