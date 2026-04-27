# Bangladesh Election Poll

A structured repo with a React (Vite) frontend to run an online mock election poll.

## Structure

```
frontend/  # Vite + React UI
backend/   # Express backend for private assets + auth
shared/    # Shared files (future)
```

## Setup

```bash
npm install
```

Node.js requirement: `20.19.0+` (Vite 7 / rolldown-vite does not support Node 18).
Use `.nvmrc` / `.node-version` in this repo to match deploy/runtime versions.

> If you prefer installing per workspace:
> - `npm install -w frontend`

Python deps for data scripts:

```bash
pip install -r frontend/scripts/requirements.txt
```

## Run (dev)

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

Create `frontend/.env.local` for backend API:

```
VITE_API_BASE=http://localhost:8080
```

Backend (private assets + Google auth + R2 signed URLs):

```bash
cd backend
npm install
```

Create `backend/.env`:

```
PORT=8080
SESSION_SECRET=change-me
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback
ALLOWED_ORIGIN=http://localhost:5173
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_REGION=auto
R2_URL_TTL=300
NODE_ENV=development
```

Start backend:

```bash
npm run dev
```

## Constituency list (XLSX)

The dropdowns load from `frontend/src/assets/Parliamentary_Constituency_Bengali.xlsx`.
Before `dev/build/preview`, a script auto-generates `frontend/src/assets/constituencies.json`.

To regenerate manually:

```bash
npm run constituencies:build
```

## Candidate list (public source + local assets)

The candidate list is generated from `http://103.183.38.66/` and saved to
`frontend/src/assets/candidates.json`.

A local-only copy without EC links is also generated:
`frontend/src/assets/candidates_new.json` (this is what the app uses).

Generate manually:

```bash
npm run candidates:build
```

Local assets (photos + PDFs) are downloaded to:
`backend/public/candidatess/{photoss,affidavitt,expensee,taxx}`.

For local dev, Vite must be able to serve these assets. If you want to serve
the backend assets directly, replace the folder with a symlink:

```bash
rm -rf frontend/public/candidatess
ln -s /home/rafi/bangladesh-election-poll/backend/public/candidatess frontend/public/candidatess
```

For private hosting, do NOT expose the assets publicly. Upload them to
Cloudflare R2 and use the backend `/api/files?path=/candidatess/...` endpoint
with Google auth (signed URLs).

### Upload assets to R2 (example)

Install AWS CLI and configure an R2 profile (or use env vars).

```bash
aws s3 sync backend/public/candidatess s3://YOUR_BUCKET/candidatess \\
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \\
  --checksum-algorithm CRC32
```

Ensure bucket is private.

Optional environment variables:

- `ELECTION_ID` (defaults to the latest national election in the source)
- `ELECTION_TYPE_ID` (default 1)
- `CANDIDATE_TYPE_ID` (default 1)
- `STATUS_ID` (default 11, which is "চূড়ান্ত")
- `CANDIDATE_SOURCE_BASE` (default `http://103.183.38.66`)

## Build

```bash
npm run build
```

## Notes

- Voting is stored locally in the browser (localStorage) for now.
- Candidate data is fetched from the public source and embedded into the frontend.
