# Andary — Backend

Real-time multiplayer trivia/bluffing game backend built with **ASP.NET Core (.NET 10)** and **SignalR**.

Players join rooms, select topics, and play rounds where they:

1. **Submit fake answers** to a trivia question.
2. **Choose** among the real answer + everyone's fakes.
3. **Score points** — +2 for picking the correct answer, +1 for each opponent fooled by your fake.

Pre-game actions (room creation/joining) use a **REST API**. All real-time gameplay goes through a **SignalR Hub**.

---

## Architecture

```
Frontend (React)
    │
    ├── REST API ──────► RoomController (create/join rooms)
    │
    └── WebSocket ─────► GameHub (real-time gameplay via SignalR)
                              │
                              ▼
                         GameManager (singleton, all game logic)
                              │
                              ▼
                         AppDbContext (EF Core → PostgreSQL)
```

### Session-Based Design

The game uses a **session approach** — gameplay data lives entirely in memory. The database is only touched at two boundaries:

- **Game start** — read questions from DB.
- **Game end** — save stats for logged-in players.

| Concept | Model | Lifetime |
|---------|-------|----------|
| Permanent account | `Player` | Database (persisted) |
| In-game identity | `SessionPlayer` | Memory (per-session) |

Anonymous (guest) players can join and play without an account. Their scores appear in-game but are not saved to the database.

---

## Getting Started

### Prerequisites

- **.NET 10 SDK**
- **PostgreSQL** (production only — dev uses in-memory DB)

### Run Locally

```bash
cd backend
dotnet restore
dotnet run
```

- **HTTPS**: `https://localhost:5242`
- **HTTP**: `http://localhost:5243`
- Uses the in-memory database by default (no PostgreSQL needed)
- OpenAPI docs available at `/openapi/v1.json` in development

### Docker

```bash
docker build -t andary-backend .
docker run -p 8080:8080 -p 8081:8081 andary-backend
```

### CORS

Allowed origins: `localhost:3000`, `127.0.0.1:3000`, `localhost:8080` (HTTP & HTTPS).

---

## REST API

Base route: `api/room`

### `POST api/room/create`

Creates a room and auto-joins the creator as owner.

**Request body:**

```json
{
  "isPrivate": true,
  "questions": 5,
  "name": "Ali's Room",
  "playerName": "Ali",
  "avatarImageName": "avatar1.png",
  "playerId": 1
}
```

- `playerName` — required (creator's display name).
- `playerId` — optional. Set if the creator is logged in (links to DB account).
- `name` — optional (defaults to `"Game Room"`).

**Response:**

```json
{
  "roomId": "uuid",
  "code": "123456",
  "name": "Ali's Room",
  "sessionId": "uuid",
  "playerName": "Ali"
}
```

### `POST api/room/join`

Joins a room by code (private) or by roomId (public). Supports both logged-in and anonymous players.

**Request body:**

```json
{
  "roomId": "uuid",
  "playerName": "Guest",
  "avatarImageName": "avatar2.png",
  "playerId": null,
  "code": "123456"
}
```

- `playerName` — required.
- `playerId` — optional (set if logged in).
- Provide either `roomId` or `code`.

**Response:**

```json
{
  "roomId": "uuid",
  "sessionId": "uuid",
  "playerName": "Guest"
}
```

### `GET api/room/{roomId}`

Returns the current room state.

**Response:**

```json
{
  "roomId": "uuid",
  "name": "Ali's Room",
  "code": "123456",
  "ownerSessionId": "uuid",
  "phase": "Lobby",
  "players": [
    { "sessionId": "uuid", "name": "Ali", "score": 0, "isReady": true }
  ],
  "totalQuestions": 5,
  "selectedTopics": ["Science"]
}
```

---

## SignalR Hub

Endpoint: `/gamehub`

### Client → Server Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `ConnectToRoom` | `roomId`, `sessionId` | Register SignalR connection after REST join |
| `SetReady` | `roomId`, `sessionId`, `isReady` | Toggle ready status in lobby |
| `AddTopic` | `roomId`, `topic` | Add a topic (max 7) |
| `RemoveTopic` | `roomId`, `topic` | Remove a topic |
| `GetTopics` | `roomId` | Get available topics from DB |
| `StartGame` | `roomId`, `sessionId` | Owner starts the game (all must be ready, ≥1 topic) |
| `SelectRoundTopic` | `roomId`, `topic` | Designated player picks round topic (multi-topic mode) |
| `SubmitFakeAnswer` | `roomId`, `fake` | Submit a fake answer |
| `ChooseAnswer` | `roomId`, `answer` | Pick an answer from the choices |
| `NextRound` | `roomId` | Advance to next round or end game |

### Server → Client Events

| Event | Payload | When |
|-------|---------|------|
| `PlayerConnected` | `displayName` | Player connects via SignalR |
| `LobbyUpdated` | `[{ sessionId, name, isReady }]` | Player toggles ready |
| `AllPlayersReady` | — | All players are ready |
| `TopicsUpdated` | `topics[]` | Topic added/removed |
| `AvailableTopics` | `topics[]` | Response to `GetTopics` (caller only) |
| `ChooseRoundTopic` | `GameState` | Prompt player to choose round topic |
| `GameStarted` | `GameState` | Round begins |
| `ShowChoices` | `choices[]` | All fakes collected — show answer options |
| `RoundEnded` | `GameState` | All answers chosen — show scores |
| `GameEnded` | `GameState` | Final round complete |

---

## Game Flow

```
CreateRoom (REST) ──► Lobby
                        │
           Players join (REST) + ConnectToRoom (SignalR)
           Players toggle ready (SetReady)
           Players add/remove topics (AddTopic/RemoveTopic)
                        │
                   Owner calls StartGame
                        │
              ┌─── Single topic? ───┐
              │                     │
              ▼                     ▼
         Use that topic      ChoosingRoundTopic
                                    │
                              SelectRoundTopic
                                    │
              ◄─────────────────────┘
              │
              ▼
        CollectingAns ──► players submit fake answers
              │
              ▼
        ChoosingAns ──► players pick from real + fakes
              │
              ▼
        ShowingRanking ──► scores displayed
              │
              ▼
        NextRound ──► loop back or GameEnded
```

---

## Data Models

### In-Memory (runtime only)

**SessionPlayer** — Temporary identity during a game session.

| Field | Type | Description |
|-------|------|-------------|
| `SessionId` | `string` | Auto-generated UUID |
| `DisplayName` | `string` | Shown in-game |
| `AvatarImageName` | `string` | Avatar image |
| `ConnectionId` | `string` | SignalR connection ID |
| `Score` | `int` | Points earned this session |
| `IsReady` | `bool` | Ready status in lobby |
| `HasSubmittedFake` | `bool` | Submitted fake this round |
| `HasChosenAnswer` | `bool` | Chose an answer this round |
| `PlayerId` | `int?` | Links to DB `Player` if logged in |

**Room** — All state for one game room.

| Field | Type | Description |
|-------|------|-------------|
| `RoomId` | `string` | UUID |
| `Name` | `string` | Human-readable room name |
| `Type` | `RoomType` | Public or Private |
| `Code` | `string?` | 6-digit code (private rooms only) |
| `Phase` | `GamePhase` | Current game phase |
| `OwnerSessionId` | `string` | SessionId of the room creator |
| `SelectedTopics` | `List<string>` | Topics chosen in lobby (1–7) |
| `CurrentRoundTopic` | `string?` | Topic for the current round |
| `TopicChooserIndex` | `int` | Rotates who picks the topic |
| `TotalQuestions` | `int` | Number of rounds |
| `CurrentQuestionIndex` | `int` | Current round number |
| `Players` | `List<SessionPlayer>` | Players in the room |
| `Questions` | `List<Question>` | Loaded from DB at game start |
| `CurrentQuestion` | `Question?` | Active question |
| `FakeAnswers` | `Dictionary` | ConnectionId → fake answer |
| `ChosenAnswers` | `Dictionary` | ConnectionId → chosen answer |

### Database (persisted)

**Player** — Long-term account for logged-in users.

| Field | Type |
|-------|------|
| `Id` | `int` (PK) |
| `Username` | `string` |
| `AvatarImageName` | `string` |
| `TotalXP` | `int` |
| `CreatedAt` | `DateTime` |

**Topic** — Trivia category.

| Field | Type |
|-------|------|
| `Id` | `int` (PK) |
| `Name` | `string` |

**Question** — Belongs to a Topic.

| Field | Type |
|-------|------|
| `Id` | `int` (PK) |
| `TopicId` | `int` (FK → Topic) |
| `Text` | `string` |
| `CorrectAnswer` | `string` |
| `Explanation` | `string` |
| `Modifier` | `string` |

**GameSession** — Record of a completed game.

| Field | Type |
|-------|------|
| `Id` | `int` (PK) |
| `TotalRounds` | `int` |
| `FinishedAt` | `DateTime?` |
| `GameConfigSnapshot` | `string` (JSON) |

**GameParticipant** — Join table: Player ↔ GameSession. Only logged-in players are saved.

| Field | Type |
|-------|------|
| `Id` | `int` (PK) |
| `GameSessionId` | `int` (FK) |
| `PlayerId` | `int` (FK) |
| `FinalScore` | `int` |
| `FinalRank` | `int` |

### Enums

| Enum | Values |
|------|--------|
| `GamePhase` | `Lobby`, `ChoosingTopic`, `ChoosingRoundTopic`, `CollectingAns`, `ChoosingAns`, `ShowingRanking`, `GameEnded` |
| `RoomType` | `Public`, `Private` |

---

## Project Structure

```
backend/
├── Controllers/
│   └── RoomController.cs      # REST API for room management
├── Data/
│   └── AppDbContext.cs         # EF Core DbContext + table config
├── Enums/
│   ├── GamePhase.cs            # Game phase states
│   └── RoomType.cs             # Public / Private
├── Hubs/
│   └── GameHub.cs              # SignalR hub for real-time gameplay
├── Models/
│   ├── AuthLocal.cs            # Email/password auth
│   ├── AuthOAuth.cs            # OAuth provider auth
│   ├── GameParticipant.cs      # Player ↔ GameSession join table
│   ├── GameSession.cs          # Completed game record
│   ├── GameState.cs            # DTO sent to clients
│   ├── Player.cs               # DB-only user account
│   ├── Question.cs             # Trivia question
│   ├── QuestionsService.cs     # Fetches questions from DB
│   ├── Room.cs                 # In-memory room state
│   ├── SessionPlayer.cs        # In-memory player identity
│   └── Topic.cs                # Trivia category
├── Services/
│   └── GameManager.cs          # Singleton — all game logic
├── Program.cs                  # App entry point + service config
├── Dockerfile                  # Multi-stage Docker build
├── appsettings.json            # Production config (PostgreSQL)
└── appsettings.Development.json # Dev config (in-memory DB)
```

---

## Services

| Service | Lifetime | Purpose |
|---------|----------|---------|
| `GameManager` | Singleton | Holds all rooms in memory, runs all game logic |
| `QuestionsService` | Scoped | Queries DB for topics and questions per request |
| `AppDbContext` | Scoped | EF Core database context |

---

## Database

**Production**: PostgreSQL via Npgsql.

```
Host=localhost;Port=5432;Database=andary;Username=root;Password=your_password;
```

**Development**: In-memory database (auto-seeded with two test players).

---

## NuGet Packages

| Package | Version |
|---------|---------|
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 10.0.3 |
| `Microsoft.AspNetCore.OpenApi` | 10.0.3 |
| `Microsoft.EntityFrameworkCore` | 10.0.3 |
| `Microsoft.EntityFrameworkCore.Design` | 10.0.3 |
| `Microsoft.EntityFrameworkCore.InMemory` | 10.0.3 |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | 10.0.0 |
| `Swashbuckle.AspNetCore` | 10.1.2 |
