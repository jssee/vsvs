# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit application using Convex as the backend database and auth provider. The project combines modern web development with a serverless backend approach:

- **Frontend**: SvelteKit 2.x with Svelte 5, TailwindCSS 4.x, TypeScript
- **Backend**: Convex for database, queries, and mutations
- **Authentication**: Custom session-based auth using Oslo crypto libraries and bcrypt-ts
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

- Convex functions are located in `src/lib/server/convex/`
- Configuration points to this directory via `convex.json`
- Generated API types are in `_generated/` subdirectories
- Database schema defined in `src/lib/server/convex/schema.ts`

#### Convex usage instructions

- usage in @./.claude/convex_rules.txt
- always reference this when using Convex functions

### Authentication System

The app implements a sophisticated session-based authentication system:

- **Session Management**: Uses secure token generation with SHA-256 hashing and Base32 encoding
- **Password Security**: bcrypt-ts with configurable salt rounds (AUTH_CONFIG.PASSWORD_SALT_ROUNDS)
- **Session Renewal**: Automatic renewal when sessions are within 15 days of expiry
- **Cookie Security**: HTTPOnly, SameSite=lax cookies with proper expiration
- **Server Hook**: `hooks.server.ts` validates sessions on every request, setting `event.locals.user/session`

Key auth files:

- `src/lib/server/auth/config.ts` - Auth configuration constants
- `src/lib/server/auth/index.ts` - Core auth functions
- `src/lib/server/convex/user.ts` - User CRUD operations
- `src/lib/server/convex/session.ts` - Session management
- `src/hooks.server.ts` - Request-level session validation

### Database Schema

- `user` table: email (indexed), password (hashed)
- `session` table: sessionId (indexed), userId (indexed), expiresAt
- All Convex functions have proper type validation using `v` schema validators

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
│   ├── server/              # Server-only code
│   │   ├── auth/            # Authentication logic
│   │   ├── convex/          # Convex functions and generated files
│   │   └── convex-client.ts # Convex client initialization
│   └── types/               # TypeScript type definitions
├── params/                  # SvelteKit parameter matchers
├── routes/                  # SvelteKit file-based routing
│   └── (auth)/             # Route group for auth pages
└── hooks.server.ts         # SvelteKit server hooks
```

## Important Implementation Notes

### Convex Client Usage

- Server-side Convex client is initialized in `src/lib/server/convex-client.ts`
- Use `getConvexClient()` for server-side database operations
- Client-side usage should use `convex-svelte` bindings

### Authentication Flow

1. User submits credentials via auth forms
2. Server validates credentials using bcrypt comparison
3. On success, generates secure session token and stores hashed version in DB
4. Sets HTTPOnly cookie with raw token
5. `hooks.server.ts` validates session on each request
6. Sessions auto-renew when within renewal threshold

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
