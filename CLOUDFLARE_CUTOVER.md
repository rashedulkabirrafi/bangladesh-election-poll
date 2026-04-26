# Cloudflare Cutover

Current status:

- Frontend is configured to use `https://api.vote4bd.com`
- The Cloudflare Worker backend exists in `cloudflare-backend/`
- Local validation passed:
  - `npm run check` in `cloudflare-backend`
  - `npm run build` in `frontend`

## Blocker

Deployment could not be completed from this environment because Wrangler is not authenticated.

Observed result:

- `wrangler whoami`: not authenticated
- `wrangler d1 list`: requires `CLOUDFLARE_API_TOKEN` in non-interactive mode

## Final Steps

1. Authenticate Wrangler:

```bash
cd cloudflare-backend
npx wrangler login
```

Or export a Cloudflare API token with Workers/D1/R2 permissions:

```bash
export CLOUDFLARE_API_TOKEN=...
```

2. Apply the D1 schema:

```bash
npx wrangler d1 execute vote4bd --file=schema.sql --remote
```

3. Set Worker secrets:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put VOTE_TOKEN_SECRET
npx wrangler secret put ADMIN_TOKEN
```

4. Deploy the Worker:

```bash
npx wrangler deploy
```

5. Verify:

```bash
curl https://api.vote4bd.com/health
curl https://api.vote4bd.com/api/votes/all
```

6. Open the frontend and test:

- Home page loads
- Vote init works
- Vote submit works
- Referendum submit works
- `/?admin=1` accepts the admin token and loads admin data

7. Delete Render only after end-to-end verification.
