# Project Guidelines

## Commands
- Build: `pnpm build` (next build)
- Dev: `pnpm dev` (next dev --turbopack)
- Start: `pnpm start` (next start)
- Lint: `pnpm lint` (next lint)
- Test: `pnpm test` (vitest run)
- Test watch mode: `pnpm test:watch` (vitest)
- Test UI: `pnpm test:ui` (vitest --ui)
- Add shadcn component: `pnpm dlx shadcn@latest add [component-name]`

## Code Style
- Use TypeScript with strict type checking
- Prefer functional components with explicit return types
- Use named exports for components and hooks
- Import order: React/Next.js > external libraries > internal modules > types
- Component files: one component per file, named same as file
- Use Tailwind CSS for styling
- Use shadcn UI library for components
- CSS variables for theme values in globals.css
- Error handling: use try/catch blocks with typed errors

## Naming Conventions
- Components: PascalCase (UserProfile.tsx)
- Hooks: camelCase with 'use' prefix (useAuth.ts)
- Utils/helpers: camelCase (formatDate.ts)
- Constants: UPPER_SNAKE_CASE
- Types/interfaces: PascalCase without prefix (User, ButtonProps)

## Authentication
- Supabase Authentication is used for handling user auth
- Magic Link Authentication is available through the `signInWithMagicLink` action
- Server actions for auth are located in `app/actions/auth.ts`
- Password-based authentication is also available for backward compatibility
- Auth callback route is at `app/auth/callback/route.ts` to handle post-authentication redirects
- Sign-in page is at `app/(auth)/signin/page.tsx`
- Sign-up page is at `app/(auth)/signup/page.tsx`
- Protected routes start with `/protected` and require authentication
- Tests for authentication are in `tests/` directory