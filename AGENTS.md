# Repository Guidelines

## Project Structure & Module Organization
- Source: place application code in `src/` (e.g., `src/core/`, `src/ui/`).
- Tests: keep tests in `tests/` mirroring module paths (e.g., `src/core/utils.py` → `tests/core/test_utils.py`).
- Assets & config: use `assets/` for static files, `configs/` for templates. Provide `.env.example` for required env vars.

## Build, Test, and Development Commands
- Install: `make install` (or `npm ci` / `uv sync` / `pip install -r requirements.txt`).
- Lint & format: `make lint` and `make fmt` (or `eslint .` / `ruff check .` and `prettier --write .` / `black .`).
- Test: `make test` (or `pytest -q` / `npm test`).
- Run locally: `make run` (or framework-specific `npm run dev` / `python -m src`).
Each target should be idempotent and fast. Prefer adding missing targets to the `Makefile`.

## Coding Style & Naming Conventions
- Indentation: 4 spaces for Python; 2 spaces for JS/TS.
- Names: modules/packages `snake_case`; classes `PascalCase`; functions/vars `snake_case` (Python) or `camelCase` (JS/TS).
- Imports: prefer absolute imports from `src` root; group stdlib, third-party, local.
- Formatting: rely on configured tools (e.g., Black/Prettier); do not hand-format.

## Testing Guidelines
- Frameworks: prefer `pytest` for Python or `vitest/jest` for JS/TS.
- Structure: mirror source tree; name files `test_*.py` or `*.test.ts`/`*.spec.ts`.
- Coverage: target ≥80% for changed code. Add focused unit tests with clear Arrange–Act–Assert.
- Run: `make test` locally and ensure it passes before opening PRs.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits, e.g., `feat(core): add budget parser`.
- PRs: small, focused; include description, rationale, linked issues, and before/after notes or screenshots when UI changes.
- Checks: all CI, lint, and tests must pass. Update docs and `.env.example` when config changes.

## Security & Configuration Tips
- Never commit secrets; use `.env.local` and add keys to `.env.example`.
- Validate and sanitize all external inputs. Pin dependencies where possible.

## Agent-Specific Instructions
- Propose a plan, make minimal diffs, and include `Makefile` targets when adding workflows.
- When editing files, keep changes surgical and update tests alongside code.
