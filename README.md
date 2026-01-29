# Bangladesh Election Poll

A structured repo with a React (Vite) frontend to run an online mock election poll.

## Structure

```
frontend/  # Vite + React UI
shared/    # Shared files (future)
```

## Setup

```bash
npm install
```

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

## Constituency list (XLSX)

The dropdowns load from `frontend/src/assets/Parliamentary_Constituency_Bengali.xlsx`.
Before `dev/build/preview`, a script auto-generates `frontend/src/assets/constituencies.json`.

To regenerate manually:

```bash
npm run constituencies:build
```

## Candidate list (public source)

The candidate list is generated from `http://103.183.38.66/` and saved to
`frontend/src/assets/candidates.json`.

Generate manually:

```bash
npm run candidates:build
```

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
