# Trivia Game Technical Design Document

## Overview

This document describes the architecture, components, and flow of a trivia online multiplayer game. The design is intended for clarity while also providing technical details for implementation.

### Project Goals

* Implement a multiplayer trivia game accessible via web.
* Provide a simple and clear game flow.
* Support anonymous play or optional sign-in.
* Maintain real-time communication between players and server using SignalR (WebSockets).

### Technology Stack

* **Front-end:** React (Vite)
* **Back-end:** ASP.NET C# (.NET 10)
* **Real-time Communication:** SignalR (WebSockets)
* **Database:** PostgreSQL
* **Reverse Proxy:** NGINX (HTTPS/TLS termination)
* **Containerization:** Docker & Docker Compose

## High-Level Architecture

```
+----------------+     SignalR (WS)     +------------------+
|                | <------------------> |                  |
|  React Client  |                      |  ASP.NET Server  |
|  (Vite SPA)    | ------------------> |  (Kestrel:5000)  |
+----------------+     REST APIs        +------------------+
        ^                                        |
        |                                        v
+----------------+                      +------------------+
|     NGINX      |                      | PostgreSQL DB    |
| (TLS, :4443)   |                      +------------------+
+----------------+
```

### Main Components

1. **Client (React / Vite)**

   * Authentication pages (login, signup, forgot/reset password, Google OAuth)
   * Lobby management (create room, join room, browse public lobbies)
   * Player info (name, avatar, profile editing)
   * Friends system (send/accept/reject requests, manage friends list)
   * Game configuration in room lobby (topics, timer, ready status)
   * Game loop UI (fake answer submission, answer selection, rankings)
   * SignalR communication for live game updates (via `SignalRContext`)
   * Internationalization support (`i18n/`)

2. **Server (ASP.NET C#)**

   * **Controllers:** REST API endpoints for auth, rooms, friends, and game history
   * **Hubs:** `GameHub` — SignalR hub for real-time game communication
   * **Services:** `GameManager` (in-memory game state), `QuestionsService` (topic/question retrieval), `FriendService` (friend operations), `EmailSender`/`EmailQueue`/`EmailBackgroundService` (async email delivery)
   * **Filters:** `ValidatePlayerOwnershipFilter` (player ownership validation on room endpoints)
   * **Data:** `AppDbContext` (Entity Framework Core), `DbInitializer` (seed data from JSON files)
   * JWT cookie-based authentication with refresh tokens
   * Google OAuth 2.0 integration

3. **Database (PostgreSQL)**

   * `Players` — player accounts with XP tracking
   * `AuthLocals` — local email/password credentials (1:1 with Player)
   * `AuthOAuths` — OAuth provider links (1:N with Player, unique on Provider+ProviderUserId)
   * `Topics` — question categories (seeded from JSON files)
   * `Questions` — trivia questions with correct answers and explanations
   * `GameSessions` — completed game session records
   * `GameParticipants` — per-player results (score, rank) for each session
   * `PasswordResetTokens` — time-limited hashed tokens for password reset
   * `FriendRequests` — pending/accepted/rejected friend requests (self-referencing)
   * `Friends` — established friendships (self-referencing many-to-many join entity)

## [Database Schema](https://dbdiagram.io/d/69835df1bd82f5fce2a47c96)

## Game Flow

### 1. Lobby Flow

1. Player opens the website.
2. Player can optionally sign in (local or Google OAuth) or play anonymously.
3. Player can create a new room (via `POST /api/room/create`) or join an existing one (via `POST /api/room/join` by room ID or 6-digit code).
4. Player establishes a SignalR connection and calls `ConnectToRoom` to register with the room's SignalR group.
5. Any player can add/remove topics (min 1, max 7) during the lobby phase.
6. Players toggle their ready status via `SetReady`. The owner is auto-ready.
7. When all players are ready and at least 1 topic is selected, the room owner calls `StartGame`.
8. Server fetches questions from all selected topics and transitions the room out of the lobby phase.

### 2. Game Loop

**Game phases (per round):**

1. **Topic Selection Stage** *(only when multiple topics are selected):*

   * The designated topic chooser (rotated each round) selects a topic for this round via `SelectRoundTopic`.
   * If the chooser does not pick within the 15-second timer, a topic is auto-selected.
   * If only 1 topic was selected for the game, this stage is skipped entirely.

2. **Fake Answer Submission Stage** (`CollectingAns`):

   * Server broadcasts the current question (correct answer hidden).
   * Players submit fake/misleading answers via `SubmitFakeAnswer`.
   * Fake answers that match the correct answer are rejected.
   * Move to next stage when all players submit or the per-question timer expires.

3. **Answer Selection Stage** (`ChoosingAns`):

   * All submitted fake answers plus the correct answer are shuffled and shown.
   * Duplicate fake answers are de-duplicated in the choice list.
   * Players choose an answer via `ChooseAnswer` within 15 seconds.
   * Move to next stage when all players choose or the timer expires.

4. **Ranking Stage** (`ShowingRanking`):

   * Correct answer and explanation are revealed.
   * Scoring: +2 points for choosing the correct answer; +1 point to the author of a fake answer each time another player selects it.
   * Rankings for this round are calculated and displayed for 5 seconds.

5. Advance to next round via `NextRound`. The topic chooser rotates to a different player. Repeat from step 1.

6. After all rounds, the game ends (`GameEnded`). Results are persisted to the database for logged-in players: game session, participant scores/ranks, and XP awards. XP is calculated based on score and rank position. Targeted `XpAwarded` messages are sent to each logged-in player.

### 3. Disconnection Handling

* On SignalR disconnect, the player is marked as temporarily disconnected with a grace period (10 seconds for both owner and regular players).
* A `PlayerDisconnected` event with `temporary: true` is broadcast to the room.
* If the player reconnects within the grace period (via `RejoinRoom`), their session and round data (fake answers, chosen answers) are migrated to the new connection.
* If the grace period expires without reconnection, the player is removed. Ownership transfers to the next player if the owner left.
* If the active game drops below 2 players, the game ends immediately and results are saved.

## WebSocket Communication

* SignalR hub endpoint: `/gamehub`
* A persistent connection is established per player after joining a room via the REST API.

### Client → Server (Hub Methods)

  * `ConnectToRoom(roomId, sessionId)` — register SignalR connection with a room
  * `RejoinRoom(roomId, sessionId)` — reconnect and resync game state
  * `LeaveRoom(roomId, sessionId)` — explicitly leave the room
  * `SetReady(roomId, sessionId, isReady)` — toggle ready status in lobby
  * `AddTopic(roomId, topic)` — add a topic to the room's selection
  * `RemoveTopic(roomId, topic)` — remove a topic from the room's selection
  * `GetTopics(roomId)` — request available topics
  * `StartGame(roomId, sessionId)` — owner starts the game
  * `SelectRoundTopic(roomId, sessionId, topic)` — choose topic for current round
  * `SubmitFakeAnswer(roomId, fake)` — submit a fake answer (returns success/error)
  * `ChooseAnswer(roomId, answer)` — select an answer during choice phase
  * `NextRound(roomId)` — advance to next round after ranking

### Server → Client (Broadcast Events)

  * `LobbyUpdated` — updated player list in lobby
  * `AllPlayersReady` — all players are ready
  * `TopicsUpdated` — updated selected topics list
  * `TopicAddFailed` — topic validation error (sent to caller only)
  * `AvailableTopics` — list of available topics (sent to caller only)
  * `ChooseRoundTopic` — prompt for topic selection (includes game state with chooser info)
  * `TopicSelectionFailed` — topic selection error (sent to caller only)
  * `GameStarted` — game started or new round begun (includes game state with question)
  * `GameStateSync` — full game state resync (used after reconnect or mid-game state changes)
  * `ShowChoices` — shuffled answer choices for selection phase
  * `RoundEnded` — round results with correct answer revealed and rankings
  * `GameEnded` — final game state after all rounds or early termination
  * `XpAwarded` — per-player XP award details (sent individually to logged-in players)
  * `GameError` — game-level error (e.g., no questions available)
  * `PlayerLeft` — a player explicitly left
  * `PlayerDisconnected` — a player disconnected (with `temporary` flag and `graceSeconds`)
  * `RoomClosed` — room closed (all players left)
  * `OwnershipTransferred` — room ownership changed to a new player

## Directory Structure

```
/Andary
│
├── frontend/              # React (Vite) project
│   ├── src/
│   │   ├── api/           # REST & SignalR client helpers
│   │   ├── components/    # Shared UI components
│   │   ├── context/       # React context (SignalRContext)
│   │   ├── i18n/          # Internationalization
│   │   ├── pages/         # Page components (Lobby, Login, Profile, Friends, game/, room/)
│   │   └── utils/         # Utility functions
│   └── public/
│
├── backend/               # ASP.NET C# project
│   ├── Controllers/       # REST API controllers (Auth, Room, Friends, History)
│   ├── Hubs/              # SignalR hubs (GameHub)
│   ├── Models/            # Entity models, DTOs, GameState, SessionPlayer
│   ├── Services/          # GameManager, QuestionsService, FriendService, Email services
│   ├── Data/              # AppDbContext, DbInitializer, SeedData (JSON)
│   ├── Enums/             # GamePhase, RoomType
│   ├── Extensions/        # Service registration and pipeline configuration
│   ├── Filters/           # Action filters (ValidatePlayerOwnershipFilter)
│   └── Config/            # Google OAuth config (google.json)
│
├── database/              # PostgreSQL Docker config
│   └── config/            # pg_hba.conf, postgresql.conf
│
├── nginx/                 # NGINX reverse proxy
│   └── conf.d/            # default.conf (TLS, API proxy, SignalR proxy)
│
├── documentation/         # Project documentation
│
├── docker-compose.yml
└── Makefile
```

## DevOps / Deployment

### Overview

The project uses a containerized architecture with one container per service. Deployment is handled via Docker and orchestrated using Docker Compose. NGINX is used as a reverse proxy to enforce HTTPS for all communication.

### Services

| Service   | Container        | Description                                    | Port     |
|-----------|------------------|------------------------------------------------|----------|
| `backend` | `dotnet_backend` | ASP.NET Kestrel server                         | 5000     |
| `nginx`   | `nginx`          | Reverse proxy, TLS termination, static files   | 4443/8080|
| `db`      | `db`             | PostgreSQL database                            | 5432     |

### NGINX Configuration

* HTTPS on port `4443` with TLS 1.2/1.3
* HTTP on port `8080` redirects to HTTPS
* `/api/` proxied to `backend:5000` (REST API)
* `/gamehub` proxied to `backend:5000` with WebSocket upgrade (SignalR)
* Static SPA files served from `/var/www/andary/html` with React Router fallback
* Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`
* Gzip compression for text, CSS, JS, JSON, XML

### Build & Deployment Steps

1. Build and start all services:

```bash
docker compose build
```

```bash
docker compose up
```

2. NGINX handles HTTPS routing and WebSocket proxying automatically via config.
3. Database is health-checked (`pg_isready`) before backend starts.
4. Database is seeded on first run from JSON files in `backend/Data/SeedData/`.

## Authentication

Players can use **email and password** (local auth) or **Google OAuth 2.0** to register and log in.

### Local Auth

* Registration via `POST /api/auth/signup` — creates a player with hashed password (ASP.NET Identity `PasswordHasher`). A welcome email is sent asynchronously via the background email service.
* Login via `POST /api/auth/login` — validates credentials and sets JWT + refresh token cookies.
* Password reset via `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` — uses time-limited SHA-256 hashed tokens (30-minute expiry).

### Google OAuth

* `GET /api/auth/google-login` returns the Google authorization URL.
* `GET /api/auth/google/callback` exchanges the authorization code for tokens, validates the Google ID token against Google's signing keys, and creates or retrieves the player.

### Session Management

* **JWT cookie** (`jwt`): 2-hour expiry, HTTP-only, used for API authentication.
* **Refresh token cookie** (`refreshToken`): 7-day expiry, HTTP-only. Hashed (SHA-256) and stored in the `Players` table.
* `POST /api/auth/refresh-token` issues a new JWT; if the refresh token is within 1 day of expiry, a new refresh token is also issued.
* `POST /api/auth/logout` clears cookies and nullifies the stored refresh token.

Authentication is used to establish player identity; during gameplay all participants are treated uniformly using in-memory session-scoped identifiers (`SessionPlayer.SessionId`). Anonymous players can join rooms without an account but their game results are not persisted.

## Notes

* Use SignalR events consistently for all live game updates.
* Keep backend services modular: separation of game session management (`GameManager`), player handling, question logic (`QuestionsService`), friend operations (`FriendService`), and email delivery (`EmailQueue`/`EmailBackgroundService`).
* In-memory game state (`GameManager._rooms`) is not persisted across server restarts. Only completed game session results are saved to the database.
* The email system uses a background service pattern: emails are enqueued to an in-memory channel and processed asynchronously by `EmailBackgroundService`.
