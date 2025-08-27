# VSVS (Svelte + Convex)

Music battles with sessions, submissions, voting, and Spotify playlist generation.

This app uses:

- SvelteKit for UI
- Convex for database, functions, cron, and actions
- A central Spotify app/account to generate playlists for each session

## Prerequisites

- Node 18+
- A Convex project (free tier is fine)
- A Spotify Developer app (created in the Spotify Dashboard)

## Local Development

Install deps and run the dev server:

```sh
npm install
npm run dev
```

Set the Convex URL for the client (Svelte) by exporting `PUBLIC_CONVEX_URL`:

```sh
# .env.local (SvelteKit)
PUBLIC_CONVEX_URL="https://YOUR-CONVEX-DEPLOYMENT.convex.cloud"
```

You can preview a production build with:

```sh
npm run build && npm run preview
```

## Convex Setup

Log in and link your local repo to your Convex project (or create a new one):

```sh
npx convex dev
# or
npx convex dashboard
```

Convex environment variables are separate from Svelte’s `.env`. Anything used by Convex functions/actions must be set in the Convex env via `npx convex env set` or the dashboard.

## Spotify Integration (Step‑by‑Step)

Playlists are created under a single "vsvs" Spotify account in the background. Users do not authorize with Spotify.

You need:

- Spotify app Client ID and Client Secret
- A long‑lived Refresh Token for the vsvs account (one‑time OAuth)

Then set these in the Convex environment (not Svelte `.env`).

### 1) Configure your Spotify app

1. Go to https://developer.spotify.com/dashboard and open your app.
2. In Settings → Redirect URIs, add an exact URI you can use locally, e.g.
   - `http://localhost:3000/auth/spotify/callback`
3. Note the Client ID and Client Secret.

### 2) Obtain a Refresh Token (one‑time)

This authorizes the vsvs Spotify account once and gives you a refresh token you can store in Convex.

1. Build an authorization URL (replace placeholders and URL‑encode the redirect URI):

   ```text
   https://accounts.spotify.com/authorize?
     client_id=YOUR_CLIENT_ID&
     response_type=code&
     redirect_uri=YOUR_ENCODED_REDIRECT_URI&
     scope=playlist-modify-public%20playlist-modify-private&
     show_dialog=true
   ```

2. Open it in a browser, log in as the vsvs account (the playlist owner), and approve.
3. Copy the `code` query parameter from the redirect.
4. Exchange the code for tokens:

   ```bash
   BASIC=$(printf "%s:%s" "YOUR_CLIENT_ID" "YOUR_CLIENT_SECRET" | base64)
   curl -s -X POST https://accounts.spotify.com/api/token \
     -H "Authorization: Basic $BASIC" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     --data-urlencode "grant_type=authorization_code" \
     --data-urlencode "code=YOUR_CODE_FROM_REDIRECT" \
     --data-urlencode "redirect_uri=YOUR_REDIRECT_URI"
   ```

   The response includes `access_token` (short‑lived) and `refresh_token` (long‑lived).

Troubleshooting the exchange:

- `invalid_grant`: The `redirect_uri` must exactly match the one used in the authorize URL and app settings; the code may be expired/used; double‑check client ID/secret.
- No refresh_token: Add `show_dialog=true`, revoke the app at https://www.spotify.com/account/apps/, and re‑authorize.

### 3) Set Convex environment variables

Set credentials and the refresh token in Convex env (required by actions):

```sh
npx convex env set SPOTIFY_CLIENT_ID "YOUR_CLIENT_ID"
npx convex env set SPOTIFY_CLIENT_SECRET "YOUR_CLIENT_SECRET"
npx convex env set SPOTIFY_REFRESH_TOKEN "YOUR_REFRESH_TOKEN"
```

Optional: You can also set a temporary `SPOTIFY_ACCESS_TOKEN` for quick tests (expires in ~1 hour). The app will prefer the refresh token and auto‑refresh an access token on demand.

### 4) How playlist generation works

- Automatic: When a session switches from Submission → Voting, a Convex action creates a Spotify playlist under the vsvs account, adds tracks sorted by stars, and stores the `playlistUrl` on the session.
- Manual (for testing): On the battle page, the creator sees a “Generate Playlist Now” button in the Current Session section.
  - On success, the playlist URL displays immediately.

Notes:

- Convex actions read env from the Convex project, not Svelte `.env`.
- Playlists are created via `POST /v1/me/playlists` for the authorized account.
- Only the battle creator can manually trigger generation.

### 5) Logs & debugging

- Convex logs: Check your Convex project dashboard → Logs for messages from actions (errors, token refreshes, API responses).
- Common errors:
  - "Spotify token unavailable": Set `SPOTIFY_REFRESH_TOKEN` in Convex env or temporarily `SPOTIFY_ACCESS_TOKEN`.
  - 401 Unauthorized: Usually an expired/invalid access token; ensure the refresh token is present and valid; scopes must include `playlist-modify-public` (and `playlist-modify-private` if needed).

## Features Overview

- Battles: create/join via invite code, max players, visibility
- Sessions: creator adds sessions with explicit deadlines; auto‑advance phases
- Submissions: per session, single/double mode, Spotify URL validation
- Voting: 3‑star system; auto finish on all votes or at deadline; tie handling
- Spotify: playlist per session using the vsvs account

## Scripts

```sh
npm run dev        # Start Svelte dev server
npm run build      # Build
npm run preview    # Preview production build
npm run lint       # Lint
npm run test       # Unit tests
```
