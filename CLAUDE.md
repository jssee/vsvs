# Project Guidelines

## Commands
- Build: `pnpm build` (next build)
- Dev: `pnpm dev` (next dev --turbopack)
- Start: `pnpm start` (next start)
- Lint: `pnpm lint` (next lint)
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