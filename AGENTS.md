# Repository Guidelines

## Project Structure & Module Organization
- `lib/vsvs`: Domain/contexts (e.g., `Vsvs.Repo`, `Vsvs.Application`).
- `lib/vsvs_web`: Web layer (router, endpoint, LiveView, gettext, telemetry).
- `assets`: Frontend JS/CSS and vendor libraries; built via esbuild and Tailwind.
- `config`: Environment configs (`dev.exs`, `test.exs`, `prod.exs`, `runtime.exs`).
- `priv/repo`: Ecto migrations and `seeds.exs`.
- `test`: ExUnit with helpers in `test/support`.
- `docs`: Project docs (e.g., `docs/SPEC-01.md`).

## Build, Test, and Development Commands
- `mix setup`: Install deps, set up DB, and build assets.
- `mix phx.server` or `iex -S mix phx.server`: Run the app (interactive with IEx).
- `mix test`: Run test suite (creates/migrates test DB via alias).
- `mix format`: Format code using `.formatter.exs` (includes HEEx formatter).
- `mix assets.build` / `mix assets.deploy`: Build assets (deploy minifies + digest).
- `mix ecto.setup` / `mix ecto.reset`: Create/migrate/seed DB or reset it.

## Coding Style & Naming Conventions
- Use `mix format` before pushing; 2-space indentation, 100-char-ish lines.
- Modules: `PascalCase` (e.g., `VsvsWeb.PageLive`). Files: `snake_case.ex`.
- Tests: `*_test.exs`. Migrations: timestamped files in `priv/repo/migrations`.
- HEEx templates: keep assigns explicit and components small; prefer function components.

## Testing Guidelines
- Framework: ExUnit with `ConnCase` (HTTP) and `DataCase` (DB).
- Place tests under `test/` mirroring source paths; name with `*_test.exs`.
- Run locally with `mix test`; add meaningful assertions for LiveView and Ecto changesets.

## Commit & Pull Request Guidelines
- Commits: imperative, concise subject (“Add X”, not “Added X”); group related changes.
- PRs: include summary, rationale, test coverage notes, and run steps.
- Link related issues; include screenshots/GIFs for UI changes.

## Security & Configuration Tips
- Secrets and runtime config come from env vars in `config/runtime.exs` (e.g., `DATABASE_URL`, `SECRET_KEY_BASE`). Do not commit secrets.
- Use Postgres locally; seed via `mix run priv/repo/seeds.exs` when needed.
