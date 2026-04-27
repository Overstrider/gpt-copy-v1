# Frontend Plan

PROJECT_RULES_STATUS: approved
PROJECT_RULES_DIGEST: bdb982e8cfdd482b485b472b55ddbcac2bf3a4180527acccbdc40ea33768a337
PROJECT_RULES_READ: yes

## Stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS 4
- TanStack Query
- Zod
- Lucide React
- React Markdown with GFM
- Vitest and Playwright

## UI

Build a ChatGPT-style interface with a conversation sidebar, main transcript, empty state, message composer, health/model indicator, loading state, and error state.

## API Contract

All API calls go through `src/lib/api.ts`. Responses are parsed with Zod schemas in `src/lib/schemas.ts`.

PHASE_2PRIME_FRONTEND_COMPLETE
