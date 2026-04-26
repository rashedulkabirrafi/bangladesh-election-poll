# Cloudflare Backend

This folder contains the Cloudflare Workers replacement for the old Render backend.

## What It Does

- Stores vote locks, constituency votes, and referendum counts in D1
- Serves candidate files from the `bd-election-assets` R2 bucket
- Supports admin editing through a bearer token instead of Google sessions

## Required Secrets

Set these with Wrangler before deploy:

- `SESSION_SECRET`
- `VOTE_TOKEN_SECRET`
- `ADMIN_TOKEN`

Example:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put VOTE_TOKEN_SECRET
npx wrangler secret put ADMIN_TOKEN
```

## First-Time Setup

1. Authenticate Wrangler:

```bash
npx wrangler login
```

Or export `CLOUDFLARE_API_TOKEN`.

2. Create the D1 database if needed:

```bash
npx wrangler d1 create vote4bd
```

3. Copy the returned `database_id` into `wrangler.jsonc`.

4. Apply the schema:

```bash
npx wrangler d1 execute vote4bd --file=schema.sql --remote
```

5. Deploy:

```bash
npx wrangler deploy
```

## Custom Domain

`wrangler.jsonc` is configured to attach the Worker to `api.vote4bd.com`.

If the domain is still pointing at Render, remove the old DNS record in Cloudflare first, then redeploy.

## Admin Access

The frontend now prompts for an admin token at `/?admin=1`.

That token must match the Worker secret `ADMIN_TOKEN`.
