# Backend Plan

PROJECT_RULES_STATUS: approved
PROJECT_RULES_DIGEST: bdb982e8cfdd482b485b472b55ddbcac2bf3a4180527acccbdc40ea33768a337
PROJECT_RULES_READ: yes

## Stack

- Rust 2024
- Axum 0.8
- Tokio
- SQLx SQLite
- Reqwest with rustls
- Tower HTTP CORS and tracing
- Serde, UUID, Time, Thiserror, Validator

## API

- `GET /health`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/{id}/messages`
- `POST /api/chat`
- `POST /api/chat/stream`

## Persistence

Create `conversations` and `messages` tables on startup. Store user and assistant messages for each request.

## Provider Boundary

`OpenRouterProvider` is the only code path that knows the OpenRouter endpoint or API key. Empty `OPENROUTER_API_KEY` produces a safe local response instead of leaking config.

PHASE_2PRIME_BACKEND_COMPLETE
