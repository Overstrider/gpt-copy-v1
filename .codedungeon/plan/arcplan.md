# Architecture Plan

PROJECT_RULES_STATUS: approved
PROJECT_RULES_DIGEST: bdb982e8cfdd482b485b472b55ddbcac2bf3a4180527acccbdc40ea33768a337
PROJECT_RULES_READ: yes

## Goal

Create `gpt-copy-v1`, a ChatGPT-style monorepo with a Rust 2024 Axum backend and a Next.js frontend.

## Decisions

- Keep OpenRouter access server-side only.
- Use SQLite through SQLx for conversations and messages.
- Use Axum JSON endpoints for normal chat and SSE for streaming shape.
- Use Next.js App Router for a single-screen ChatGPT-style experience.
- Use TanStack Query for API state, Zod for wire validation, and React Markdown for assistant content.

## Verification

- Backend: `cargo fmt --check`, `cargo check`, `cargo test`.
- Frontend: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run e2e`.

PHASE_1_COMPLETE
