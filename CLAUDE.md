# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit application using Convex as the backend database and auth provider. The project combines modern web development with a serverless backend approach:

- **Frontend**: SvelteKit 2.x with Svelte 5, TailwindCSS 4.x, TypeScript
- **Backend**: Convex for database, queries, and mutations
- **Authentication**: Better Auth with Convex adapter for session-based authentication
- **Testing**: Vitest with both browser (Playwright) and Node.js environments
- **Package Manager**: pnpm (note the pnpm-specific config in package.json)

## Development Commands

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type checking and validation
pnpm check
pnpm check:watch  # Watch mode

# Code quality
pnpm lint         # Prettier + ESLint check
pnpm format       # Auto-format with Prettier

# Testing
pnpm test:unit    # Run tests once
pnpm test         # Alias for test:unit --run
```

## Architecture

### Convex Integration

- Convex functions are located in `src/lib/convex/`
- Configuration points to this directory via `convex.json`
- Generated API types are in `_generated/` subdirectories
- Database schema defined in `src/lib/convex/schema.ts`
- Convex app configuration in `src/lib/convex/convex.config.ts` (includes better-auth component)

#### Convex usage instructions

- usage in @./.claude/convex_rules.txt
- always reference this when using Convex functions

### Authentication System

The app uses **Better Auth** with the Convex adapter for authentication:

- **Framework**: Better Auth (https://www.better-auth.com) - framework-agnostic auth library
- **Integration**: @convex-dev/better-auth component provides Convex database adapter
- **Helper Package**: @mmailaender/convex-better-auth-svelte for SvelteKit integration
- **Session Management**: Token-based authentication via `event.locals.token`
- **Password Security**: Better Auth handles password hashing and validation
- **Cookie Security**: Automatic secure cookie handling via better-auth

#### Key Auth Files

**Convex Backend:**

- `src/lib/convex/auth.ts` - Better Auth instance with Convex adapter and `createAuth()` function
- `src/lib/convex/auth.config.ts` - Better Auth configuration (providers, options)
- `src/lib/convex/convex.config.ts` - Convex app config with better-auth component
- `src/lib/convex/http.ts` - HTTP router with auth routes registered

**SvelteKit Integration:**

- `src/lib/auth-client.ts` - Client-side auth instance with Convex plugin
- `src/lib/server/auth-helpers.ts` - Server-side helpers (`requireAuth`, `getAuth`)
- `src/hooks.server.ts` - Extracts auth token and stores in `event.locals.token`
- `src/routes/api/auth/[...all]/+server.ts` - Auth API endpoints (sign in, sign up, etc.)
- `src/app.d.ts` - TypeScript types for `App.Locals.token`

#### Client-Side Auth Usage

```typescript
import { authClient } from "$lib/auth-client";

// Sign up new user
await authClient.signUp.email({
  email: "user@example.com",
  password: "password123",
  name: "username",
});

// Sign in existing user
await authClient.signIn.email({
  email: "user@example.com",
  password: "password123",
});

// Sign out
await authClient.signOut();

// Get session (reactive)
const session = authClient.useSession();
```

#### Server-Side Auth Usage

```typescript
import { requireAuth, getAuth } from "$lib/server/auth-helpers";

// For protected routes (redirects to /signin if not authenticated)
export const load: PageServerLoad = async (event) => {
  const { client, user } = await requireAuth(event);
  // `client` is authenticated Convex HTTP client
  // `user` is the current user object

  const data = await client.query(api.myModule.myQuery, { userId: user._id });
  return { data, user };
};

// For optional auth (doesn't redirect)
export const load: PageServerLoad = async (event) => {
  const { client, user } = await getAuth(event);
  // Both `client` and `user` may be null if not authenticated

  if (!client) {
    // Handle unauthenticated case
  }
};
```

### Database Schema

Better Auth manages its own database tables via the Convex component:

- Authentication tables are automatically created and managed by @convex-dev/better-auth
- Tables include: users, sessions, accounts, and verification tokens
- All Convex functions have proper type validation using `v` schema validators
- User queries available via `api.auth.getCurrentUser`

### Testing Configuration

- Dual testing environments: browser (Playwright/Chromium) and Node.js
- Client tests (\*.svelte.{test,spec}.{js,ts}) run in browser environment
- Server tests run in Node.js environment, excluding Svelte files
- Vitest setup requires assertions (`expect.requireAssertions: true`)

## File Structure Patterns

```
src/
├── lib/
│   ├── components/           # Reusable Svelte components
│   ├── convex/              # Convex functions and configuration
│   │   ├── _generated/      # Auto-generated Convex API types
│   │   ├── auth.ts          # Better Auth + Convex integration
│   │   ├── auth.config.ts   # Better Auth configuration
│   │   ├── convex.config.ts # Convex app with components
│   │   ├── http.ts          # HTTP routes for auth
│   │   └── schema.ts        # Database schema
│   ├── server/              # Server-only code
│   │   ├── auth-helpers.ts  # Auth helper functions (requireAuth, getAuth)
│   │   └── convex-client.ts # Convex client initialization (for unauthenticated use)
│   ├── auth-client.ts       # Client-side Better Auth instance
│   └── types/               # TypeScript type definitions
├── params/                  # SvelteKit parameter matchers
├── routes/                  # SvelteKit file-based routing
│   ├── (auth)/             # Route group for auth pages (signin, signup, signout)
│   └── api/auth/[...all]/  # Better Auth API endpoints
└── hooks.server.ts         # SvelteKit server hooks (extracts auth token)
```

## Important Implementation Notes

### Convex Client Usage

**Server-Side (in +page.server.ts files):**

- Use `requireAuth(event)` or `getAuth(event)` helpers to get authenticated Convex client
- These return `{ client, user }` where `client` is a `ConvexHttpClient` with auth token
- For unauthenticated queries, use `getConvexClient()` from `src/lib/convex-client.ts`

**Client-Side (in .svelte files):**

- Use `convex-svelte` bindings for reactive queries
- Setup in `src/routes/+layout.svelte` via `setupConvex()`

### Authentication Flow

1. **Sign Up/Sign In**: User submits credentials via auth forms using `authClient.signUp.email()` or `authClient.signIn.email()`
2. **Better Auth Processing**: Better Auth validates credentials and creates session
3. **Cookie Storage**: Better Auth sets HTTPOnly session cookie automatically
4. **Token Extraction**: `hooks.server.ts` calls `getToken()` to extract auth token from cookies
5. **Token Storage**: Token stored in `event.locals.token` for use in load functions and actions
6. **Server-Side Auth**: Use `requireAuth(event)` to get authenticated Convex client and user
7. **Convex Queries**: Authenticated client automatically includes token in all Convex requests
8. **Session Management**: Better Auth handles session renewal and expiration automatically

### Important Authentication Notes

- **Never use `getConvexClient()` for authenticated operations** - it returns an unauthenticated client
- **Always use auth helpers** in server-side code: `requireAuth()` or `getAuth()`
- **Auth token flow**: cookies → `getToken()` → `event.locals.token` → `createConvexHttpClient({ token })`
- **Client-side auth**: Use `authClient` from `$lib/auth-client` for sign in/up/out
- **Better Auth docs**: https://www.better-auth.com for configuration options
- **Convex Better Auth docs**: https://convex-better-auth.netlify.app for integration details

### Code Quality Tools

- ESLint configuration uses flat config format with TypeScript, Svelte, and Prettier integration
- Prettier configured with Svelte and TailwindCSS plugins
- TypeScript strict mode enabled with proper Svelte integration

## Testing Approach

When writing tests:

- Use `pnpm test:unit` for running tests
- Browser tests for component testing (\*.svelte.{test,spec}.{js,ts})
- Node.js tests for server-side logic
- All test files require explicit assertions due to `requireAssertions: true`
