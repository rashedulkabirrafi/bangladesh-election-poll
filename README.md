# Bangladesh Election Poll

A structured monorepo with a React (Vite) frontend and a Node.js backend to run an online mock election poll.

## Structure

```
backend/   # Express API (IP-based vote blocking + PostgreSQL)
frontend/  # Vite + React UI
shared/    # Shared files (future)
```

## Setup

```bash
npm install
```

> If you prefer installing per workspace:
> - `npm install -w frontend`
> - `npm install -w backend`

## Postgres setup

1. Create a database (example: `bd_election_poll`).
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`.
3. The backend auto-creates tables on startup.

## Run (dev)

Terminal 1:
```bash
npm run backend:dev
```

Terminal 2:
```bash
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to `http://localhost:5000`.

## Constituency list (XLSX)

The dropdowns load from `frontend/src/assets/Parliamentary_Constituency_Bengali.xlsx`.
Before `dev/build/preview`, a script auto-generates `frontend/src/assets/constituencies.json`.

To regenerate manually:

```bash
npm run constituencies:build
```

## Build

```bash
npm run build
```

## Notes

- IP-based vote blocking happens in the backend (`backend/src/index.js`).
- Votes are stored in PostgreSQL (`votes` and `voted_ips` tables).
- To deploy, run the backend as a service and host the frontend `dist` folder on your static host.
