# Repository Guidelines

## Project Structure & Module Organization
- `src/routes`: SvelteKit routes (`+layout.svelte`, `+page.svelte`, server actions).
- `src/lib`: shared UI and server code; Convex lives in `src/lib/server/convex` (schema, queries, mutations, actions, crons).
- `src/lib/server/utils`: pure helpers; easiest to unit test.
- `static`: public assets served as‑is.
- Config: `svelte.config.js`, `vite.config.ts`, `eslint.config.js`, `tsconfig.json`.

## Build, Test, and Development Commands
- `npm run dev`: start SvelteKit dev server.
- `npm run dev:convex`: start Convex local dev (DB/functions).
- `npm run build`: production build via Vite.
- `npm run preview`: serve the production build locally.
- `npm run lint`: Prettier check + ESLint.
- `npm run format`: Prettier write.
- `npm run check`: Svelte type/diagnostics.
- `npm run test`: Vitest unit tests (headless).

Examples
- Run app and backend locally in two shells: `npm run dev` and `npm run dev:convex`.
- Set Svelte env: add `PUBLIC_CONVEX_URL=...` to `.env.local`.
- Set Convex secrets: `npx convex env set KEY VALUE` (do not put secrets in `.env.local`).

## Coding Style & Naming Conventions
- TypeScript, 2‑space indent; Prettier enforces formatting.
- ESLint rules in `eslint.config.js`; fix with `npm run lint` or `npm run format`.
- Svelte components: PascalCase for reusable components in `src/lib/components`; route files follow SvelteKit’s `+page.svelte` pattern and kebab‑case folders.
- Server code in `src/lib/server/**`; avoid browser‑only APIs there.

## Testing Guidelines
- Framework: Vitest. Co‑locate tests as `*.test.ts` near code (e.g., `src/lib/server/utils/foo.test.ts`).
- Prioritize testing pure utilities and form/server actions. Mock Convex where needed.
- Run `npm run test`; add focused tests before refactors.

## Commit & Pull Request Guidelines
- Commits: short, imperative mood (e.g., "Add voting logic", "Refactor Spotify URL validation").
- PRs: include a clear summary, linked issues, screenshots for UI changes, and brief test instructions.
- Keep changes scoped; avoid unrelated churn and drive‑by renames.

## Security & Configuration Tips
- Never commit secrets. Client‑exposed vars must be prefixed `PUBLIC_` and live in `.env.local`; all secrets go into Convex env (`npx convex env set ...`).
- Validate and sanitize all inputs in Convex functions.

## Agent‑Specific Notes
- Follow existing structure and naming; prefer minimal, focused patches.
- Do not add new runtime deps without justification; align with existing tooling (SvelteKit, Convex, Vitest, ESLint, Prettier).
