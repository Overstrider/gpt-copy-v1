# Project Rules Compact

PROJECT_RULES_STATUS: APPROVED
PROJECT_RULES_SOURCE: .codedungeon/project-rules.md

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
- VERIFY backend changes with formatting, build/check, and tests from `backend/`.
- VERIFY frontend changes with lint, typecheck, tests, and build from `frontend/`.
- VERIFY repository hygiene with `git diff --check`.
- VERIFY installed CodeDungeon artifacts with `.\.codex\bin\codedungeon.exe status` after setup or migration changes.
- VERIFY Project Rules changes with `.\.codex\bin\codedungeon.exe rules lint` and `.\.codex\bin\codedungeon.exe rules status`.
- VERIFY secrets are absent with a search for OpenRouter secret prefixes before committing.
- MUST read `.codedungeon/project-rules.compact.md` when present before planning, executing, reviewing, or reporting completion.
- MUST run required verification before claiming completion.
- MUST update README or env documentation when setup, commands, or runtime behavior changes.
