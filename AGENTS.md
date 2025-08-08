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


<!-- phoenix-gen-auth-start -->
## Authentication

- **Always** handle authentication flow at the router level with proper redirects
- **Always** be mindful of where to place routes. `phx.gen.auth` creates multiple router plugs and `live_session` scopes:
  - A plug `:fetch_current_user` that is included in the default browser pipeline
  - A plug `:require_authenticated_user` that redirects to the log in page when the user is not authenticated
  - A `live_session :current_user` scope - For routes that need the current user but don't require authentication, similar to `:fetch_current_user`
  - A `live_session :require_authenticated_user` scope - For routes that require authentication, similar to the plug with the same name
  - In both cases, a `@current_scope` is assigned to the Plug connection and LiveView socket
  - A plug `redirect_if_user_is_authenticated` that redirects to a default path in case the user is authenticated - useful for a registration page that should only be shown to unauthenticated users
- **Always let the user know in which router scopes, `live_session`, and pipeline you are placing the route, AND SAY WHY**
- `phx.gen.auth` assigns the `current_scope` assign - it **does not assign a `current_user` assign**.
- To derive/access `current_user`, **always use the `current_scope.user` assign**, never use **`@current_user`** in templates or LiveViews
- **Never** duplicate `live_session` names. A `live_session :current_user` can only be defined __once__ in the router, so all routes for the `live_session :current_user`  must be grouped in a single block
- Anytime you hit `current_scope` errors or the logged in session isn't displaying the right content, **always double check the router and ensure you are using the correct plug and `live_session` as described below**

### Routes that require authentication

LiveViews that require login should **always be placed inside the __existing__ `live_session :require_authenticated_user` block**:

    scope "/", AppWeb do
      pipe_through [:browser, :require_authenticated_user]

      live_session :require_authenticated_user,
        on_mount: [{VsvsWeb.UserAuth, :require_authenticated}] do
        # phx.gen.auth generated routes
        live "/users/settings", UserLive.Settings, :edit
        live "/users/settings/confirm-email/:token", UserLive.Settings, :confirm_email
        # our own routes that require logged in user
        live "/", MyLiveThatRequiresAuth, :index
      end
    end

Controller routes must be placed in a scope that sets the `:require_authenticated_user` plug:

    scope "/", AppWeb do
      pipe_through [:browser, :require_authenticated_user]

      get "/", MyControllerThatRequiresAuth, :index
    end

### Routes that work with or without authentication

LiveViews that can work with or without authentication, **always use the __existing__ `:current_user` scope**, ie:

    scope "/", MyAppWeb do
      pipe_through [:browser]

      live_session :current_user,
        on_mount: [{VsvsWeb.UserAuth, :mount_current_scope}] do
        # our own routes that work with or without authentication
        live "/", PublicLive
      end
    end

Controllers automatically have the `current_scope` available if they use the `:browser` pipeline.

<!-- phoenix-gen-auth-end -->