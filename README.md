*This project has been created as part of the 42 curriculum by aatieh, dikhalil, malja-fa, rsham, and sbibers.*

# Andary — أنداري

A competitive multiplayer trivia game designed for Tawjihi (final year high-school) students in the Arab world. Andary turns exam preparation into a fun, real-time challenge played with friends — helping alleviate the pressure of the pre-university period by making learning social and engaging.

---

## Table of Contents

- [Description](#description)
- [Key Features](#key-features)
- [Instructions](#instructions)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Installation](#installation)
  - [Run](#run)
- [Team Information](#team-information)
- [Project Management](#project-management)
- [Technical Stack](#technical-stack)
- [Database Schema](#database-schema)
- [Features List](#features-list)
- [Modules](#modules)
- [Individual Contributions](#individual-contributions)
- [Resources](#resources)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Description

### Goal

Introduce a fun, competitive learning environment for Tawjihi students. Instead of studying alone, students can create or join game rooms, answer curriculum-based questions across multiple subjects, and compete in real-time with classmates — turning revision sessions into an engaging social experience.

### Overview

Andary is a full-stack web application that lets players:

1. **Sign up / Log in** (local email+password or Google OAuth).
2. **Create or join game rooms** — public lobbies visible to everyone, or private rooms with a 6-digit code.
3. **Select curriculum topics** (Arabic, Math, Physics, Chemistry, Biology, English, etc.).
4. **Play rounds** — each round a player picks a topic, a question is shown, players submit fake answers, then everyone votes on the correct one. Points are awarded for fooling others and choosing the right answer.
5. **Track progress** — XP, game history, and friend lists.

The game supports **Arabic, English, and Chinese** through full i18n, and works on desktop and mobile browsers.

## Key Features

- **Real-time multiplayer gameplay** via SignalR WebSockets (2–6 players per room)
- **Public & private rooms** with lobby system and 6-digit join codes
- **Topic selection per round** — rotating topic chooser among players
- **Fake-answer bluffing mechanic** — submit fake answers, vote on real vs. fake, score points
- **XP & ranking system** — earn XP based on performance, tracked across sessions
- **User authentication** — local email/password with JWT + refresh tokens, Google OAuth
- **Password reset via email** — SMTP-based email service with background processing
- **Friend system** — send/accept/reject requests, view friends list
- **Game history** — paginated history of past sessions with scores and ranks
- **Multilingual UI** — Arabic (RTL), English, Chinese via i18next
- **Dark/Light theme toggle** — persisted per-user
- **Responsive SPA** — React + Tailwind CSS, works on mobile and desktop
- **Dockerized deployment** — single `make up` to run the entire stack behind Nginx with HTTPS

---

## Instructions

### Prerequisites

| Tool / Software | Minimum Version | Notes |
|---|---|---|
| Docker | 20.10+ | Required for containerized deployment |
| Docker Compose | v2+ | Bundled with Docker Desktop |
| Make | any | For convenience targets (`make up`, `make down`, etc.) |
| OpenSSL | any | Auto-generates self-signed SSL certs via Makefile |
| Git | any | To clone the repository |

> **Optional (for local development outside Docker):**
>
> | Tool | Version |
> |---|---|
> | .NET SDK | 10.0 |
> | Node.js | 20+ |
> | npm | 10+ |
> | PostgreSQL | 15+ |

### Configuration

The project requires environment files to be created before running.

#### 1. Root `.env` (used by `docker-compose.yml` for Nginx & DB)

Create a `.env` file in the project root:

```bash
cp .env.example .env   # if a template exists, otherwise create manually
```

Required variables:

```env
# PostgreSQL
POSTGRES_USER=<your_db_user>
POSTGRES_PASSWORD=<your_db_password>
POSTGRES_DB=<your_db_name>
```

#### 2. Backend `.env` (used by the .NET backend)

Create `backend/.env` (for local development) and/or `backend/.env.docker` (for Docker):

```env
# Database
DB_HOST=<db_host>          # "db" in Docker, "localhost" locally
DB_PORT=5432
DB_NAME=<your_db_name>
DB_USER=<your_db_user>
DB_PASSWORD=<your_db_password>

# JWT
JWT_SECRET=<a_strong_random_secret>
JWT_ISSUER=<issuer>
JWT_AUDIENCE=<audience>

# SMTP (for password reset emails)
SMTP_HOST=<smtp_host>
SMTP_PORT=587
SMTP_USER=<smtp_email>
SMTP_PASS=<smtp_password>
SMTP_FROM_EMAIL=<from_email>
SMTP_FROM_NAME=Andary

# Google OAuth (optional)
GOOGLE_CLIENT_ID=<google_client_id>
GOOGLE_CLIENT_SECRET=<google_client_secret>
GOOGLE_REDIRECT_URI=<redirect_uri>
```

#### 3. Google OAuth (optional)

Place your Google OAuth credentials in `backend/Config/google.json`, or configure via environment variables as shown above.

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd Andary

# 2. Create environment files (see Configuration above)

# 3. Build all Docker images (also auto-generates SSL certs)
make build
```

### Run

#### Docker (recommended)

```bash
# Start all services (backend, frontend via Nginx, PostgreSQL)
make up

# Open the app in your browser
# https://localhost:4443

# Check container status
make ps

# Stop all services
make down

# Full cleanup (remove volumes and orphans)
make fdown
```

#### Local development (without Docker)

```bash
# Terminal 1 — Start PostgreSQL (must be running on port 5432)

# Terminal 2 — Backend
cd backend
dotnet run

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev

# Open http://localhost:5173
```

---

## Team Information

| Member | Role(s) | Responsibilities |
|---|---|---|
| **aatieh** | Technical Lead / Developer | designing the product and deciding all of the technical details and implementation, dev ops and assisting with backend development |
| **dikhalil** | Developer | Database creation, handeling most non-game elements of the backend and implementing the overall design and REST APIS |
| **malja-fa** | Project Manager / Developer | Setting deadlines for features, arranging meetings, setting and following up on the agreed upon schedule, frontend development of all game related features |
| **rsham** | Developer | handeling all of the game related backend developments, implementing all of the game desgin and handeling all of the websocket flow |
| **sbibers** | Product owner / Developer | deciding all of the features and modules, choosing and implementing the frontend desgin and non-game related apis |

---

## Project Management

### Work Organization

- **Task distribution:** team was distrubted into backend and frontend developers, and tasks was distributed by feature
- **Meeting rhythm:** weekly to bi-weekly meetings based on the estimated feature deadline
- **Review/QA process:** the feature will be tested in development, and the final quality test will be done in the pull request

### Tools Used

| Purpose | Tool |
|---|---|
| Project tracking | GitHub Issues / Notion |
| Source control | Git + GitHub |

### Communication Channels

- **Primary:** Slack
- **Decision documentation:** the intial documentation in the Github repostry, the up to date documentation and chages are all in Notion
- **Blocker handling:** if any blocker was found, the work is distributed further or a team meeting is arranged to solve it

---

## Technical Stack

### Frontend

| Category | Technology | Why |
|---|---|---|
| Framework | **React 19** (Vite) | Component-based SPA with fast HMR via Vite |
| Styling | **Tailwind CSS 4** | Utility-first CSS for rapid, consistent styling |
| State management | **React Context** + local state | Lightweight; sufficient for auth state and SignalR connection |
| Routing | **React Router v7** | Industry-standard SPA routing with protected routes |
| Real-time | **@microsoft/signalr** | Native SignalR client for WebSocket game communication |
| HTTP client | **Axios** | Interceptor-based JWT refresh, clean API abstraction |
| i18n | **i18next** + react-i18next | Arabic (RTL), English, Chinese support with auto-detection |
| Animation | **Motion (Framer Motion)** | Smooth UI transitions and animations |

### Backend

| Category | Technology | Why |
|---|---|---|
| Runtime / Framework | **ASP.NET Core 10** (.NET 10) | High-performance, cross-platform, strong typing with C# |
| API style | **REST** (Controllers) + **WebSocket** (SignalR Hub) | REST for CRUD, SignalR for real-time game events |
| ORM | **Entity Framework Core 10** | Code-first migrations, LINQ queries, PostgreSQL provider |
| Authentication | **JWT** (access + refresh tokens in HTTP-only cookies) | Stateless auth with secure cookie storage |
| OAuth | **Google OAuth 2.0** | Social login for convenience |
| Email | **MailKit** | SMTP email sending for password resets |

### Database

| Category | Technology | Why |
|---|---|---|
| DBMS | **PostgreSQL 15+** | Robust relational database; strong ACID compliance, excellent EF Core support, free and open-source |

### Other Significant Technologies

| Technology | Purpose |
|---|---|
| **Docker & Docker Compose** | Containerized multi-service deployment |
| **Nginx** | Reverse proxy, SSL termination, static file serving, gzip compression |
| **OpenSSL** | Self-signed certificate generation for local HTTPS |

### Major Technical Choices — Justification

1. **SignalR over plain WebSockets** — SignalR provides automatic reconnection, group management, and strongly-typed hub methods, which are essential for a multiplayer game with room-based groups.
2. **ASP.NET Core over Node.js** — One of the most widely used frameworks in the local Jordian market, and can play into the team background in C, C++, and Java programing background. 
3. **PostgreSQL over MongoDB** — The data model is inherently relational (players ↔ sessions ↔ participants ↔ questions), making a relational database the natural fit.
4. **Cookie-based JWT over localStorage** — HTTP-only cookies prevent XSS token theft; refresh tokens enable seamless session renewal.
5. **Vite over Create React App** — Faster dev server startup, native ESM, and smaller production bundles.

---

## Database Schema

### Visual Representation

```mermaid
    Player ||--o| AuthLocal : "has (1:1)"
    Player ||--o{ AuthOAuth : "has (1:N)"
    Player ||--o{ GameParticipant : "participates in"
    Player ||--o{ PasswordResetToken : "has"
    Player ||--o{ FriendRequest : "sends"
    Player ||--o{ FriendRequest : "receives"
    Player ||--o{ Friend : "friendships"

    GameSession ||--o{ GameParticipant : "has participants"

    Topic ||--o{ Question : "contains"

    Player {
        int Id PK
        string Username
        int Xp
        string AvatarImageName
        datetime CreatedAt
        string RefreshToken
        datetime RefreshTokenExpiryTime
    }

    AuthLocal {
        int Id PK
        int PlayerId FK
        string Email "unique"
        string PasswordHash
        datetime CreatedAt
    }

    AuthOAuth {
        int Id PK
        int PlayerId FK
        string Provider
        string ProviderUserId
        string Email
        datetime CreatedAt
    }

    GameSession {
        int Id PK
        datetime FinishedAt
        int TotalRounds
        string GameConfigSnapshot
        datetime CreatedAt
    }

    GameParticipant {
        int Id PK
        int GameSessionId FK
        int PlayerId FK
        int FinalScore
        int FinalRank
    }

    Topic {
        int Id PK
        string Name
        datetime CreatedAt
    }

    Question {
        int Id PK
        int TopicId FK
        string QuestionText
        string CorrectAnswer
        string Explanation
        string TopicName
        string Modifier
        datetime CreatedAt
    }

    PasswordResetToken {
        int Id PK
        int PlayerId FK
        string TokenHash
        datetime ExpiryDate
        bool IsUsed
        datetime CreatedAt
    }

    FriendRequest {
        int Id PK
        int SenderId FK
        int ReceiverId FK
        string Status
        datetime CreatedAt
        datetime RespondedAt
    }

    Friend {
        int Id PK
        int Player1Id FK
        int Player2Id FK
        datetime CreatedAt
    }
```

### Tables and Relationships

| Entity | Purpose | Relationships |
|---|---|---|
| **Player** | Core user account | 1:1 with AuthLocal, 1:N with AuthOAuth, 1:N with GameParticipant, 1:N with PasswordResetToken, N:N self-ref via Friend & FriendRequest |
| **AuthLocal** | Email/password credentials | Belongs to Player (cascade delete) |
| **AuthOAuth** | OAuth provider links (Google) | Belongs to Player; unique on (Provider, ProviderUserId) |
| **GameSession** | A completed game instance | 1:N with GameParticipant |
| **GameParticipant** | Join table: player ↔ session | Belongs to Player and GameSession; stores final score/rank |
| **Topic** | Question category (e.g., رياضيات) | 1:N with Question |
| **Question** | A trivia question | Belongs to Topic |
| **PasswordResetToken** | Time-limited reset token | Belongs to Player (cascade delete) |
| **FriendRequest** | Pending/accepted/rejected request | Self-referencing via Sender ↔ Receiver |
| **Friend** | Established friendship | Self-referencing join table (Player1 ↔ Player2) |

### Key Fields and Data Types

| Entity | Field | Type | Notes |
|---|---|---|---|
| Player | Id | int | PK, auto-increment |
| Player | Username | string(50) | Required |
| Player | Xp | int | Default 0 |
| AuthLocal | Email | string(100) | Unique index |
| AuthLocal | PasswordHash | string(255) | Bcrypt hashed |
| AuthOAuth | Provider + ProviderUserId | string | Composite unique index |
| GameSession | GameConfigSnapshot | string | JSON snapshot of game config at time of play |
| GameParticipant | FinalScore / FinalRank | int | Calculated at game end |
| Question | QuestionText | string(500) | Required |
| Question | CorrectAnswer | string(500) | Required |
| Question | Explanation | string(1000) | Optional |
| FriendRequest | Status | string(20) | "pending" / "accepted" / "rejected" |
| PasswordResetToken | TokenHash | string(88) | SHA-256 hashed token |
| PasswordResetToken | ExpiryDate | datetime | Token validity window |

---

## Features List

| # | Feature | Description | Team Member(s) |
|---|---|---|---|
| 1 | **User Registration (Local)** | Email/password signup with avatar selection | dikhalil, sbibers |
| 2 | **User Login (Local)** | JWT-based authentication with refresh tokens stored in HTTP-only cookies | dikhalil |
| 3 | **Google OAuth Login** | Sign in with Google; auto-creates player account | dikhalil |
| 4 | **Password Reset** | Forgot password flow with email link (hashed tokens, expiry) | dikhalil, aatieh, malja-fa |
| 5 | **Player Profile** | View/edit username, avatar; view XP | sbibers, dikhalil |
| 6 | **Room Creation** | Create public/private rooms with topic selection, custom settings | rsham, malja-fa |
| 7 | **Room Joining** | Join via lobby list (public) or 6-digit code (private); guest + authenticated | rsham, malja-fa |
| 8 | **Real-time Lobby** | Live player list, ready-up, owner controls, topic selection | rsham, malja-fa |
| 9 | **Gameplay — Topic Selection** | Rotating topic chooser per round; auto-select on timeout | rsham, malja-fa |
| 10 | **Gameplay — Fake Answer Submission** | Players submit bluff answers; timed phase with deadline | rsham, malja-fa |
| 11 | **Scoring & Leaderboard** | Points for correct answers and fooling others; live ranking per round | rsham, malja-fa |
| 12 | **XP System** | XP awarded at game end based on rank; persisted to player profile | rsham, malja-fa, sbibers |
| 13 | **Game History** | Paginated history of past games with score, rank, date | rsham, dikhalil, sbibers |
| 14 | **Friend System** | Send/accept/reject/cancel friend requests; view friends list | aatieh, sbibers |
| 15 | **Internationalization (i18n)** | Arabic (RTL), English, Chinese — full UI translation | malja-fa, sbibers |
| 16 | **Dark / Light Theme** | Toggleable theme persisted in localStorage | malja-fa |
| 17 | **Dockerized Deployment** | Multi-container setup with Docker Compose, Nginx reverse proxy, HTTPS | aatieh |
| 18 | **Question Seeding** | Database seeded with Tawjihi curriculum questions from JSON files | aatieh |
| 19 | **Guest Play** | Anonymous users can join rooms without an account (deduplication via client key) | aatieh, rsham, malja-fa |

---

## Modules

### Chosen Modules

| Module | Type | Why Chosen | Implementation Summary | Implemented By |
|---|---|---|---|---|
| Use a framework for both the frontend and backend. | Major | A full-stack framework approach ensures consistency, maintainability, and faster development across both layers. | React 19 with Vite for the frontend SPA; ASP.NET Core 10 for the backend REST API and SignalR hub. | aatieh, dikhalil, malja-fa, rsham, sbibers |
| Implement real-time features using WebSockets or similar technology | Major | A multiplayer trivia game requires instant communication between players for submitting answers, voting, and receiving live updates. | SignalR WebSocket hub (`GameHub`) manages all real-time events — lobby updates, round phases, answer submission, scoring, and game-end broadcasts via group-based messaging. | malja-fa, rsham |
| Use an ORM for the database. | Minor | Simplifies database access with code-first migrations and type-safe queries, reducing boilerplate SQL. | Entity Framework Core 10 with the Npgsql PostgreSQL provider; all models defined as C# classes with relationships configured in `AppDbContext.OnModelCreating`. | dikhalil |
| Real-time collaborative features | Minor | Players interact simultaneously during every game phase — submitting fake answers, voting, and viewing live leaderboards. | Each game phase (collecting answers, choosing answers, showing rankings) is broadcast in real-time to all room members via SignalR groups with server-side phase timers. | malja-fa, rsham |
| Support for multiple languages | Minor | The target audience spans Arabic and English speakers; adding Chinese broadens accessibility. | i18next with `react-i18next` and browser language detection; three full translation files (`ar.json`, `en.json`, `ch.json`) covering all UI strings. | malja-fa |
| Right-to-left (RTL) language support | Minor | Arabic is the primary language for the target Tawjihi audience and requires proper RTL layout. | The app dynamically sets `dir="rtl"` on the HTML root when Arabic is selected and `dir="ltr"` otherwise; Tailwind CSS handles RTL-aware spacing and alignment. | sbibers, malja-fa |
| Support for additional browsers | Minor | Students use a variety of browsers and devices; broad compatibility is essential for adoption. | The React + Vite build targets modern ESM-compatible browsers; tested on Chrome, Firefox, Safari, and Edge on both desktop and mobile. | aatieh, dikhalil, sbibers, malja-fa, rsham |
| Standard user management and authentication | Major | Players need persistent accounts to track XP, game history, and friend lists across sessions. | Local signup/login with hashed passwords, JWT access tokens + refresh tokens in HTTP-only cookies, profile editing (username, avatar), and SMTP-based password reset with hashed time-limited tokens. | aatieh, dikhalil, sbibers |
| Game statistics and match history | Minor | Letting players review past performance encourages continued engagement and learning. | `GameSession` and `GameParticipant` tables store final scores and ranks; the `HistoryController` provides a paginated API for retrieving a player's past games. | dikhalil, sbibers |
| Implement remote authentication with OAuth 2.0 | Minor | Provides a frictionless login option and reduces sign-up abandonment. | Google OAuth 2.0 flow — the backend exchanges the authorization code for tokens, retrieves user info, and creates or links an `AuthOAuth` record to the player. | dikhalil, sbibers |
| Implement a complete web-based game where users can play against each other. | Major | The core purpose of the project is a competitive trivia game playable entirely in the browser. | Full game loop: room creation → lobby → topic selection → question display → fake answer submission → answer voting → scoring → leaderboard → next round or game end — all managed by `GameManager` and `GameHub`. | malja-fa, rsham |
| Remote players — Enable two players on separate computers to play the same game in real-time. | Major | The game's value comes from playing with friends remotely, not just locally. | Players join the same room via a public lobby list or a 6-digit private code; all game state is synchronized through SignalR group broadcasts so each player sees the same phases simultaneously. | malja-fa, rsham |
| Multiplayer game (more than two players). | Major | A trivia bluffing game is more fun and competitive with a larger group. | Rooms support 2–6 players; the topic-chooser rotates among all players, scoring accounts for multiple fake answers, and the leaderboard ranks all participants. | malja-fa, rsham |
| Game customization options. | Minor | Letting the room owner tailor settings increases replayability and fits different study needs. | Room creators can choose public/private type, select up to 7 curriculum topics, set the number of questions, and configure the answer timer (10–120 seconds). | aatieh, malja-fa, rsham |
Guest play without account creation | Minor | Lowering the barrier to entry lets students try the game instantly without committing to sign-up, increasing adoption. | Anonymous users can join rooms, and play full games — but XP and history are not persisted. | aatieh, rsham, malja-fa, sbibers |

### Point Calculation

- Total Major modules → 2 × 6 = **12** pts
- Total Minor modules → 1 × 9 = **9** pts
- **Total: 12 + 9 = 21 pts**

## Individual Contributions

### aatieh

- **Implemented:** Dockerized deployment (Docker Compose, Nginx reverse proxy, HTTPS with self-signed SSL certs), question seeding from JSON files, guest play deduplication via client key, password reset email flow, game history API, game customization options.
- **Technical contributions:** Designed the overall product architecture and all technical decisions; configured multi-container Docker setup with health checks, TLS termination, and SignalR WebSocket proxying through Nginx; built the `Makefile` for build/deploy automation; assisted with backend development across auth, history, and room endpoints
- **Challenges faced:** A noticeable delay happened in authentication flows that triggered emails (especially signup and forgot-password). Because SMTP delivery was part of the same request path, response time could spike under slow mail-server/network conditions, and in some cases requests timed out, which negatively impacted UX.
- **How solved:** I decoupled email delivery from HTTP requests by introducing an in-memory, thread-safe email queue (`IEmailQueue`/`EmailQueue`) and a hosted background worker (`EmailBackgroundService`) that continuously drains the queue and sends via `EmailSender` (MailKit). In `AuthController`, signup and forgot-password now persist data first, enqueue welcome/reset emails (`EnqueueWelcomeEmail`, `EnqueueResetEmail`), and return immediately; the background service handles actual SMTP sending with error logging so a failed email no longer blocks or breaks user-facing auth requests.

### dikhalil

- **Implemented:** Database creation and schema design, user registration and login (local), with JWT-based authentication, Google OAuth login, password reset flow (hashed tokens with expiry), player profile editing, friend system (send/accept/reject/cancel requests, friends list), game history API, OAuth 2.0 remote authentication
- **Technical contributions:** Designed and implemented all Entity Framework Core models and relationships in `AppDbContext.OnModelCreating`; built the `AuthController` with local signup/login, JWT + refresh token cookie management, and Google OAuth callback flow; implemented `FriendService` and `FriendsController` for the full friend request lifecycle; built the `HistoryController` with paginated game history queries; configured the Npgsql PostgreSQL provider with code-first migrations
- **Challenges faced:** Implementing Google OAuth 2.0 login and correctly handling the callback flow, redirect URI configuration, and token exchange process.
Migrating JWT authentication from header-based tokens to HTTP-only cookies.
Designing API authorization logic to protect endpoints for authenticated users while still allowing guest access to specific game routes.
- **How solved:** I debugged the Google OAuth flow by properly configuring the redirect URI in Google Cloud Console and ensuring the backend callback endpoint correctly handled the authorization code before generating the local JWT.
For JWT migration, I refactored the backend authentication logic to issue JWT and refresh tokens as secure HTTP-only cookies instead of returning them in headers, and updated the authentication middleware to extract and validate tokens from cookies.
To handle authorization for both authenticated users and guests, I implemented a custom filter that checks for authentication cookies only when the player is logged in, while allowing guest users to access specific endpoints without triggering authentication validation. This ensured secure protection for registered users without blocking guest gameplay.

### malja-fa

- **Implemented:** Frontend development for all game-related features — room creation UI, room joining UI, real-time lobby (live player list, ready-up, topic selection), gameplay topic selection, fake answer submission, answer voting, scoring and leaderboard display, XP system display, internationalization (Arabic RTL, English, Chinese), dark/light theme toggle, password reset frontend, guest play frontend
- **Technical contributions:** Built the `SignalRContext` React context for managing the SignalR connection lifecycle across game pages; implemented all game phase UIs (topic choosing, fake answer submission, answer selection, ranking/leaderboard); integrated i18next with `react-i18next` and browser language detection across three full translation files (`ar.json`, `en.json`, `ch.json`); implemented dynamic RTL/LTR switching with Tailwind CSS; managed project schedule, set feature deadlines, and arranged team meetings
- **Challenges faced:** the surprise disconnection of the player mid game and information sharing between multiple players
- **How solved:** the frontend saves the game session and phases to the local storage in the browser so when the disconnection happens the backend rejoin the player and the front render the current phase of the game the info sharing between players when the player make an event it is sent to the backend to let other players know that an event happened

### rsham

- **Implemented:** All game-related backend development — `GameManager` service (in-memory game state, room lifecycle, scoring logic, XP calculation), `GameHub` SignalR hub (all real-time WebSocket events), room creation/joining backend, real-time lobby state management, gameplay topic selection with rotating chooser, fake answer submission and validation, answer choice phase, scoring and leaderboard calculation (+2 correct / +1 fool), XP awards persisted at game end, game history persistence (`GameSession`, `GameParticipant`), guest play backend
- **Technical contributions:** Designed and implemented the full `GameHub` with 12 client→server hub methods and 18 server→client broadcast events; built server-side phase timers with `CancellationTokenSource` for automatic phase advancement on timeout; implemented disconnection handling with grace periods (10s), reconnection with round data migration, and automatic ownership transfer; built `GameManager.SaveGameSession` to persist scores, ranks, and XP for logged-in players; implemented long-polling for lobby list updates via `TaskCompletionSource` waiters
- **Challenges faced:** The main backend challenge was keeping the game synchronized in real time while the server remained the single source of truth. I had to manage room state, move the game safely between timed phases, and make sure scoring, leaderboard updates, and XP calculation were all accurate and controlled by the backend instead of the client. Another challenge was handling disconnects without breaking the room state or stopping the game flow. I also needed to support both guest users and logged-in users in the same gameplay flow while only saving persistent progress for authenticated players. A specific issue I faced was preventing the same player from joining the same room more than once. This was challenging because sessionId was not reliable for identifying the same player, since a new session could be created each time the player joined, which could allow duplicate entries. In addition, keeping the lobby list updated efficiently without unnecessary server load was also an important backend concern.
- **How solved:** I solved these issues by centralizing all game state and room lifecycle logic inside GameManager and using GameHub as the real-time communication layer between the server and connected players. I implemented server-side timers with CancellationTokenSource so the backend could automatically advance the game when a phase timeout was reached. I kept answer validation, scoring, leaderboard ranking, and XP calculation on the backend to ensure fairness and consistency. For disconnect cases, I added backend handling to preserve room stability and transfer ownership when needed. To support both guest and authenticated players, I separated gameplay participation from persistence logic so everyone could play, while only logged-in users received saved XP and stored session history. To prevent duplicate joins, I used a stable clientKey instead of relying only on sessionId, and I checked that clientKey during the join process to make sure the same player could not enter the same room twice. Finally, I used TaskCompletionSource-based long-polling for lobby updates and implemented SaveGameSession to persist final scores, ranks, and XP in GameSession and GameParticipant.

### sbibers

- **Implemented:** Feature and module planning, frontend design and implementation for non-game pages — user registration UI, login UI, player profile page (view/edit username, avatar, XP), friend system UI (send/accept/reject requests, friends list), game history UI, internationalization (Arabic RTL, English, Chinese), guest play UI, XP system display
- **Technical contributions:** Defined all project features and modules; designed and implemented the frontend UI with React + Tailwind CSS for auth pages, profile, friends, and history; built Axios-based API client (`auth.js`, `friends.js`) with interceptor-based JWT refresh; implemented OAuth 2.0 frontend integration (Google login redirect); contributed to i18next translation files and RTL layout support; built responsive layouts for mobile and desktop browsers
- **Challenges faced:** Managing JWT token refresh across concurrent API requests — when multiple requests fire simultaneously and all receive a 401 Unauthorized response, each would independently attempt to refresh the token, causing duplicate refresh calls, token rotation conflicts, or cascading failures. The OAuth 2.0 Google login flow added further complexity since the redirect leaves the SPA entirely, losing all React state, and the app must detect the OAuth callback and re-bootstrap authentication on return.
- **How solved:** Implemented a Promise-based queue pattern in the Axios response interceptor: the first 401 triggers a refresh call and sets an isRefreshing flag; all subsequent 401s during that window are pushed into a failedQueue array as deferred Promises that resolve only after the single refresh completes, then automatically retry with the new token. Excluded auth-related endpoints (/auth/refresh-token, /auth/login, /auth/signup) from interception to prevent infinite loops. For OAuth, used a server-initiated redirect flow where the backend returns the Google authorization URL, and on return the app detects a ?login=oauth query parameter in a useEffect hook, calls getMe() to fetch the authenticated user from the now-valid HTTP-only JWT cookie, and gates all route rendering behind a loading flag to prevent a flash of the login page.

---

## Resources

### Topic References

- **ASP.NET Core Documentation:** https://learn.microsoft.com/en-us/aspnet/core/
- **SignalR Documentation:** https://learn.microsoft.com/en-us/aspnet/core/signalr/
- **Entity Framework Core:** https://learn.microsoft.com/en-us/ef/core/
- **React Documentation:** https://react.dev/
- **React Router:** https://reactrouter.com/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **i18next:** https://www.i18next.com/
- **Docker Documentation:** https://docs.docker.com/
- **Nginx Documentation:** https://nginx.org/en/docs/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **JWT Introduction:** https://jwt.io/introduction
- **Google OAuth 2.0:** https://developers.google.com/identity/protocols/oauth2

### AI Usage Disclosure

AI assistance was used in a limited and controlled manner throughout the project. Its use was restricted to the following areas:

| Task | Project Part | How It Helped | Validation Done by Team |
|---|---|---|---|
| Identifying inconsistencies | Backend & frontend | Flagged mismatches between API contracts and frontend calls, inconsistent naming conventions, and missing error handling paths | Reviewed by the initiating team member; verified during pull request evaluation |
| Translation assistance | Frontend (i18n) | Assisted with Arabic and Chinese translation accuracy for UI strings | reviewed all translations; corrections applied before merging |
| Bug detection | Backend (SignalR, auth) | Helped identify potential race conditions, null reference paths, and edge cases in game phase transitions | Each flagged issue was manually reproduced, validated, and fixed by the responsible developer |
| Industry-standard practices | Backend (auth, security) | Provided guidance on JWT cookie security settings, password hashing best practices, and refresh token rotation patterns | Team compared suggestions against official ASP.NET Core and OWASP documentation |
| Documentation support | README, API docs, technical design | Assisted with drafting and structuring project documentation to ensure completeness and consistency | All documentation was reviewed and edited by the full team before merging |
| Structural blueprints & minor adjustments | Backend & frontend | Used for drafting initial code structure and making minor refactoring adjustments | All generated code was rewritten or adapted by the developer; no AI output was merged without validation |

**What AI was NOT used for:** Planning system architecture, deciding feature scope, or determining implementation strategies. All architectural decisions, feature definitions, module selections, and technical design choices were made entirely by the team. The core game logic (`GameManager`, `GameHub`), database schema design, authentication flows, and frontend component structure were implemented by team members.

**Verification process:** All AI-generated content was first reviewed by the team member who initiated its use, then subsequently reviewed by the full team during pull request evaluation before merging into shared branches.

---

## Known Limitations

- No automated test suite yet
- Self-signed SSL certs cause browser warnings
- Question database limited to seeded JSON files

## Future Improvements

- Add automated unit and integration tests
- Implement Redis-backed distributed game state for scalability
- Add more Tawjihi subjects and question banks
- Admin panel for question management