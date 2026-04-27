# CodeDungeon Oneshot Report: Health Indicator

PROJECT_RULES_STATUS: approved
PROJECT_RULES_DIGEST: bdb982e8cfdd482b485b472b55ddbcac2bf3a4180527acccbdc40ea33768a337
PROJECT_RULES_READ: yes

Status: COMPLETE
Verification: PASS
Review: APPROVED

## Changes

- Exports the frontend health indicator for focused tests.
- Adds coverage for loading, offline, and healthy/model states.

## Verification Commands

- `cargo fmt --check`
- `cargo check`
- `cargo test`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e`
- `npm audit --omit=dev --audit-level=moderate`
- `rg "sk-or-v1-" .`
- `git diff --check`
