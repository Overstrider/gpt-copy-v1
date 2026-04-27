# Lite Plan: Streaming Chat Polish

PROJECT_RULES_STATUS: approved
PROJECT_RULES_DIGEST: bdb982e8cfdd482b485b472b55ddbcac2bf3a4180527acccbdc40ea33768a337
PROJECT_RULES_READ: yes

## Goal

Improve `gpt-copy-v1` so streaming responses are consumed end to end by the UI.

## Tasks

1. Backend streaming
   - Keep `POST /api/chat/stream` as an SSE endpoint.
   - Emit token events and a final done event containing the complete chat response.
   - Add a test that verifies token and done events.

2. Frontend streaming
   - Add a streaming API helper for the POST SSE endpoint.
   - Render assistant text incrementally while the stream is active.
   - Disable duplicate sends while streaming.
   - Preserve partial text on recoverable stream errors.

3. Verification
   - Run backend formatting, check, and tests.
   - Run frontend lint, typecheck, tests, build, e2e, and production audit.
   - Run secret scan and `git diff --check`.

## Acceptance

- Streaming visibly updates assistant text before completion.
- Final assistant message is persisted and loaded through normal message fetches.
- Frontend tests cover streamed sending.
- CodeDungeon final report shows COMPLETE with Verification: PASS.
