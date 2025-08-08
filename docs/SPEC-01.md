# VSVS Musical Taste Competition App - Technical Specification

## Overview
VSVS is a web application where friends compete to determine who has the best musical taste through themed song submission and voting sessions within clubs.

## Core Entities & Data Model

### Users
- `id` (primary key)
- `email` (unique, required)
- `password_hash` (required)
- `display_name` (string, required)
- `profile_picture_url` (string, optional)
- Authentication fields (email confirmation, password reset tokens, etc.)

### Clubs
- `id` (primary key)
- `name` (string, required)
- `description` (text, required)
- `creator_id` (references users)
- `member_limit` (integer, set by creator)
- `created_at`, `updated_at`

### ClubMemberships
- `id` (primary key)
- `club_id` (references clubs)
- `user_id` (references users)
- `joined_at`
- Unique constraint on (club_id, user_id)

### Seasons
- `id` (primary key)
- `club_id` (references clubs)
- `name` (string, e.g., "Season 1")
- `status` (enum: active, completed)
- `started_at`, `ended_at`

### Sessions
- `id` (primary key)
- `season_id` (references seasons)
- `theme` (string, required)
- `session_number` (integer)
- `songs_per_user` (integer, configurable)
- `voting_points_per_user` (integer, configurable)
- `submission_deadline` (datetime)
- `voting_deadline` (datetime)
- `status` (enum: setup, submission, voting, completed)
- `playlist_generated` (boolean, default false)

### Submissions
- `id` (primary key)
- `session_id` (references sessions)
- `user_id` (references users)
- `spotify_url` (string, required)
- `song_title` (string, extracted from Spotify)
- `artist` (string, extracted from Spotify)
- `submitted_at`

### Votes
- `id` (primary key)
- `session_id` (references sessions)
- `voter_id` (references users)
- `submission_id` (references submissions)
- `points` (integer, > 0)
- `voted_at`

### SessionResults
- `id` (primary key)
- `session_id` (references sessions)
- `user_id` (references users)
- `total_points_received` (integer)
- `calculated_at`

## Core Features & Business Logic

### 1. User Management
- User registration and authentication
- Profile management (display name, profile picture)
- User dashboard showing all clubs and their current status

### 2. Club Management
- Any user can create clubs with name, description, and member limit
- Only club creator can invite users (email-based invitations)
- Only club creator can remove users
- Users can be in multiple clubs simultaneously
- Club member listing and management

### 3. Season & Session Management
- Club creators manage seasons and sessions
- Configurable session parameters (songs per user, voting points, deadlines)
- Automatic session phase transitions based on deadlines
- Session status tracking (setup → submission → voting → completed)

### 4. Song Submissions
- Users submit Spotify URLs during submission phase
- Validate URLs and extract song metadata via Spotify API
- Hide submissions from other users until voting begins
- Enforce songs-per-user limit per session

### 5. Voting System
- Users allocate configurable point totals across submissions
- Cannot vote for own submissions
- Anonymous voting until session completion
- Flexible point distribution (can give all points to one song or spread across multiple)
- Must allocate all available points to submit vote

### 6. Scoring & Leaderboards
- Points awarded proportional to votes received
- Real-time season leaderboards
- Session-by-session results tracking
- Champion determination at season end

### 7. Spotify Integration
- Dedicated Spotify app account for playlist creation
- Manual playlist generation by club creators
- Public playlists titled with session theme
- Batch song addition after submission phase ends

### 8. Administration
- Admin interface for platform management
- User and club oversight capabilities
- System health monitoring

## Technical Requirements

### Background Jobs
- Automatic session phase transitions based on deadlines
- Spotify API integration for metadata extraction
- Playlist generation workflows

### Data Validation
- Spotify URL format validation
- User permission checks (club membership, voting eligibility)
- Session timing and status validation

### Real-time Features
- Real-time updates for session status changes
- Dynamic leaderboards
- Live voting interfaces
- Club management interfaces

### API Integrations
- Spotify Web API for song metadata and playlist creation
- Error handling for invalid URLs and API failures

## User Flows

### Club Creation Flow
1. User creates club with name, description, member limit
2. User invites others via email
3. Invitees accept and join club
4. Creator sets up first season and sessions

### Competition Flow
1. Session enters submission phase
2. Users submit Spotify URLs (validated and stored)
3. Submission deadline triggers playlist generation
4. Session enters voting phase
5. Users allocate points across submissions
6. Voting deadline triggers result calculation
7. Points awarded and leaderboard updated
8. Next session begins or season ends

### Admin Flow
1. Platform admins access admin interface
2. Monitor clubs, users, and system health
3. Manage platform-wide settings and policies

---

## Phoenix LiveView Implementation Notes

### Framework-Specific Components
- **Authentication**: Extend existing `phx.gen.auth` with display_name and profile_picture_url
- **Admin Interface**: Use Torch (https://github.com/mojotech/torch) for admin views
- **Real-time Updates**: LiveView components for session status, leaderboards, and voting
- **Background Jobs**: Oban for scheduled tasks and API integrations
- **Database**: PostgreSQL with Ecto migrations
- **Styling**: Keep design simple, avoid over-styling

### LiveView Pages
- User dashboard
- Club management (create, invite, manage members)
- Season/session setup
- Song submission interface
- Voting interface
- Leaderboards
- Results views

### Context Modules
- `Accounts` (users, authentication)
- `Clubs` (clubs, memberships, invitations)
- `Competitions` (seasons, sessions, submissions, votes)
- `Spotify` (API integration, playlist generation)
- `Scoring` (result calculation, leaderboards)

## Pre-Implementation Decisions & Defaults

### Authentication
- Default:  auth via `phx.gen.auth` 
- Require email verification before club actions; sign-in emails use one-time, expiring links.
- Spotify OAuth is for API access only (not for sign-in).

### Spotify Integration
- Dedicated app account with scopes: `playlist-modify-public`, `playlist-modify-private`.
- Store per-session `spotify_playlist_id`; playlist name: `<Club>: <Session Theme>` and description with season/session info.
- Deduplicate by Spotify track ID within a session (block duplicates by default).

### Voting & Scoring Rules
- Integer points; default `voting_points_per_user = 10` (configurable per session).
- Users must allocate all points; cannot vote for own submissions; one vote record per (voter, submission).
- Ties: Allowed; rankings can be shared with identical totals.

### Time & Scheduling
- Store all times in UTC; display in a per-club timezone (default UTC) configurable by creator.
- Use Oban for deadlines and retries: queues `scheduled` (phase transitions), `spotify` (metadata/playlist), `mailers`.
- Exponential backoff; idempotency keys per job (e.g., `session:<id>:phase:submission->voting`).

### Data Integrity
- Uniques: `submissions(session_id, spotify_track_id)`, `votes(voter_id, submission_id)`, `club_memberships(club_id, user_id)`.
- FKs with `on_delete: :delete_all` from sessions → submissions → votes; prevent deleting clubs with active seasons.
- Validate session status windows and membership for all actions.

### Real-time & PubSub
- Topics: `club:<club_id>` and `session:<session_id>`; broadcast status, leaderboard, and vote updates.
- Presence optional for online participants; LiveView handles optimistic UI with server validation.

### Access Control & Invites
- Roles: platform `admin`, club `creator`, club `member`.
- Invites: email and shareable token links with expiry and optional max-uses; creator can revoke.
- Admin scope: expand later; MVP focuses on creator/member tools.

### Privacy
- Votes remain anonymous to users during and after sessions; results show totals/aggregates only.
- Admins may audit raw votes via admin tools if enabled (feature-flagged).

### Operations & Environment
- Required env: `DATABASE_URL`, `SECRET_KEY_BASE`, `PHX_HOST`, `PORT`.
- Spotify: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`.
- Mailer (Swoosh): provider-specific creds (e.g., `SMTP_*` or API keys).
- Deploy with `mix release`; run migrations on deploy; secure LiveDashboard to dev only.

This specification provides a framework-agnostic foundation that can be implemented in Phoenix LiveView, React/Node.js, Django, Rails, or any other web framework while maintaining the core business logic and data model.
