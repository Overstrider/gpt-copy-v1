# gpt-copy-v1

ChatGPT-style example app generated through the CodeDungeon v1 model.

## Stack

- `backend/`: Rust 2024, Axum, Tokio, SQLx SQLite, Reqwest, Tower HTTP.
- `frontend/`: Next.js App Router, TypeScript, Tailwind, TanStack Query, Zod, Lucide.

OpenRouter is called only by the backend. Do not commit real provider keys.

## Environment

Copy `.env.example` to your local shell or a local `.env` file:

```powershell
$env:OPENROUTER_API_KEY = "<operator-provided-openrouter-key>"
$env:OPENROUTER_MODEL = "openrouter/free"
$env:DATABASE_URL = "sqlite://gpt-copy.db"
$env:BACKEND_PORT = "8080"
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:8080"
```

## Backend

```powershell
Set-Location backend
cargo fmt --check
cargo check
cargo test
cargo run
```

API endpoints:

- `GET /health`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/{id}/messages`
- `POST /api/chat`
- `POST /api/chat/stream`

## Frontend

```powershell
Set-Location frontend
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

The frontend expects `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`.

## CodeDungeon Run

Initial full run metadata:

```text
PROJECT_RULES_STATUS: approved
PROJECT_RULES_DIGEST: bdb982e8cfdd482b485b472b55ddbcac2bf3a4180527acccbdc40ea33768a337
PROJECT_RULES_READ: yes
```
