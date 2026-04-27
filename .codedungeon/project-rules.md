# Project Rules

Status: APPROVED
Generated: 2026-04-27

## Sources Reviewed

- AGENTS.md
- .codedungeon/README.md
- .codedungeon/commands/codedungeon.md
- .codedungeon/commands/main-quest.md
- .codedungeon/commands/side-quest.md
- .codedungeon/commands/one-shot.md
- .codex/config.toml
- .codex/agents/*.toml
- .agents/skills/*

## Architecture And Boundaries

- This repository is the generated `gpt-copy-v1` example project.
- The app must be a ChatGPT-style monorepo with `backend/` and `frontend/` at the repository root.
- `backend/` owns API routes, persistence, OpenRouter proxying, validation, and health checks.
- `frontend/` owns the Next.js UI, conversation experience, streaming display, and health/status indicators.
- CodeDungeon runtime state belongs in `.codedungeon/`; Codex provider files belong in `.codex/` and `.agents/skills/`.

## Project Rules

- MUST use the promoted `$codedungeon --full|--lite|--oneshot|--auto|--rules <prompt>` workflow surface.
- MUST run Project Rules discovery before the first real implementation task.
- MUST include `PROJECT_RULES_STATUS`, `PROJECT_RULES_DIGEST`, and `PROJECT_RULES_READ` in plans, tasks, reviews, phase handoffs, and final reports.
- MUST keep implementation PR-centered for CodeDungeon generated work.
- MUST keep the required project shape: `backend/`, `frontend/`, root `README.md`, and root `.env.example`.
- MUST use Rust 2024 with Axum for backend implementation.
- MUST use Next.js App Router with TypeScript for frontend implementation.
- MUST configure OpenRouter through environment variables only.
- MUST NOT commit API keys, tokens, credentials, generated local `.env` files, or machine-local private configuration.
- MUST NOT write the literal OpenRouter key into source, docs, task files, tests, or CodeDungeon state.
- MUST preserve unrelated user changes shown by `git status --short`.

## Commands And Verification

- VERIFY backend changes with formatting, build/check, and tests from `backend/`.
- VERIFY frontend changes with lint, typecheck, tests, and build from `frontend/`.
- VERIFY repository hygiene with `git diff --check`.
- VERIFY installed CodeDungeon artifacts with `.\.codex\bin\codedungeon.exe status` after setup or migration changes.
- VERIFY Project Rules changes with `.\.codex\bin\codedungeon.exe rules lint` and `.\.codex\bin\codedungeon.exe rules status`.
- VERIFY secrets are absent with a search for OpenRouter secret prefixes before committing.

## Security And Data Rules

- Backend must be the only layer that calls OpenRouter.
- Frontend must never expose `OPENROUTER_API_KEY`.
- `.env.example` may contain placeholder names and safe defaults only.
- SQLite data files and runtime databases must not be committed unless they are intentional migrations or fixtures without secrets.
- Provider failures must return structured errors and must not leak secret values.

## Agent Operating Rules

- MUST read `.codedungeon/project-rules.compact.md` when present before planning, executing, reviewing, or reporting completion.
- MUST run required verification before claiming completion.
- MUST update README or env documentation when setup, commands, or runtime behavior changes.
- ASK WHEN a requirement conflicts with these rules or would require committing secrets.

## Open Questions

- None.
