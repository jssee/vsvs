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

## Spotify Integration
The Spotify integration allows users to create playlists from session submissions. This feature is implemented on the `jh/spotify-integration` branch.

### Architecture Overview
The integration follows OAuth 2.0 Authorization Code flow and consists of:
1. **Authentication Flow**: Users authenticate with Spotify to grant playlist creation permissions
2. **Token Management**: Access tokens stored in secure httpOnly cookies
3. **Playlist Creation**: Fetches session submissions and creates Spotify playlists

### Environment Variables Required
```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### API Routes
- `app/api/spotify/auth/route.ts` - Initiates OAuth flow, redirects to Spotify authorization
- `app/api/spotify/callback/route.ts` - Handles OAuth callback, exchanges code for tokens
- `app/api/spotify/status/route.ts` - Checks current Spotify connection status
- `app/api/spotify/playlist/route.ts` - Creates playlists from session submissions
- `app/api/test/seed-submissions/route.ts` - Seeds test Spotify track data for development

### Components
- `components/spotify-integration.tsx` - React component for Spotify integration UI

### OAuth Flow Details
1. User clicks "Connect Spotify Account" with sessionId parameter
2. Redirects to `/api/spotify/auth?sessionId=<id>` 
3. Route constructs Spotify OAuth URL with required scopes:
   - `playlist-modify-public`
   - `playlist-modify-private` 
   - `user-read-private`
4. User authorizes on Spotify, returns to `/api/spotify/callback`
5. Callback exchanges authorization code for access/refresh tokens
6. Tokens stored in secure httpOnly cookies:
   - `spotify_access_token` (expires in 1 hour)
   - `spotify_refresh_token` (expires in 30 days)
   - `spotify_user_id` (expires in 30 days)

### Playlist Creation Process
1. Check Spotify authentication status via `/api/spotify/status`
2. Call `/api/spotify/playlist` with sessionId
3. Fetch submissions from database for given session
4. Extract Spotify track IDs from submission URLs using regex patterns
5. Create playlist using Spotify Web API with session/gauntlet name
6. Add tracks to playlist using track URIs
7. Return playlist details (ID, name, URL, track count)

### Track ID Extraction
Supports multiple Spotify URL formats:
- `spotify:track:ID`
- `open.spotify.com/track/ID`
- `spotify.com/track/ID`

### Dependencies Added
- `@spotify/web-api-ts-sdk` - Official Spotify Web API TypeScript SDK

### Testing Features
- Test data seeding endpoint creates sample Spotify submissions
- Uses well-known tracks (Rick Astley, The Killers, Queen) for testing
- Component includes test buttons for development workflow

### Security Considerations
- Tokens stored in httpOnly cookies (not accessible via JavaScript)
- Secure flag enabled in production
- State parameter used in OAuth flow for CSRF protection
- Token validation on each API call

### Error Handling
- Comprehensive error handling for OAuth failures
- Invalid token detection and user feedback
- Missing submission handling
- Network request error management

### Integration Points
- Works with existing session/gauntlet/submission data structure
- Submission.track_id field stores Spotify URLs
- Playlist names derived from gauntlet and session names
- Integrated into session detail pages at: `app/protected/clubs/[id]/gauntlets/[gauntletId]/sessions/[sessionId]/page.tsx`
- Component displays in sidebar alongside session details

### Implementation Status
✅ **Completed Features:**
- OAuth 2.0 authentication flow with Spotify
- Secure token management via httpOnly cookies
- Playlist creation from session submissions
- Track ID extraction from various Spotify URL formats
- Integration into session detail pages
- Test data seeding for development
- Error handling for authentication and API failures

### Database Schema Notes
- Uses `submission` table (not `submissions`)
- Uses `session` table (not `sessions`) 
- Session theme stored in `theme` column (not `name`)
- Gauntlet relationship via `gauntlet_id` foreign key
- Submissions can have null `user_id` for test data
- Profile relationship is optional in submission queries

### Troubleshooting
- **"Failed to fetch submissions"**: Check table names are correct (`submission`, not `submissions`)
- **Profile null errors**: Ensure null-safe operators (`?.`) when accessing submission.profile
- **OAuth failures**: Verify SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables
- **Token expiration**: Tokens auto-refresh, but manual re-authentication may be needed after 30 days

### Development Workflow
1. Use `/api/test/seed-submissions` to create test Spotify submissions
2. Test OAuth flow via SpotifyIntegration component
3. Verify playlist creation with test data
4. Check session pages for proper integration display