# Game Session Flow (Start → Finish)

This diagram describes the **complete lifecycle of a game session** — from room creation to game end — showing how players, the room owner, REST API, and SignalR WebSocket interact.

---

## Actors

* **Player**: Any participant (logged-in or guest)
* **Room Owner**: The player who created the room; controls topics & game start
* **Frontend (React)**: UI, cached state in localStorage
* **Backend (ASP.NET Core)**: Authoritative game logic via `GameManager` singleton
* **SignalR Hub (`GameHub`)**: Real-time WebSocket communication

---

## Phase 1: Room Creation / Joining (REST)

```
Player ──REST POST /api/room/create──▶ Backend
         { name, playerName, questions, isPrivate, selectedTopics?, answerTimeSeconds? }

Backend ──200──▶ Player
         { roomId, sessionId, code, ... }
```

```
Player ──REST POST /api/room/join──▶ Backend
         { roomId | code, playerName, playerId? }

Backend ──200──▶ Player
         { roomId, sessionId, code, ... }
```

**Notes:**

* Backend creates an in-memory `Room` with `Phase = Lobby`
* Room gets a unique 6-digit code for private/code-based joining
* No WebSocket yet — client uses `roomId` + `sessionId` to connect next

---

## Phase 2: Lobby (`Lobby`)

```
Player ──WS──▶ ConnectToRoom(roomId, sessionId)

Backend ──WS──▶ All Players
         LobbyUpdated [{ sessionId, name, avatar, isReady }]
```

```
Players ──WS──▶ SetReady(roomId, sessionId, true/false)

Backend ──WS──▶ All Players
         LobbyUpdated (updated readiness)

IF all ready:
  Backend ──WS──▶ All Players
           AllPlayersReady
```

```
Owner ──WS──▶ AddTopic / RemoveTopic(roomId, topic)

Backend ──WS──▶ All Players
         TopicsUpdated ["English", "رياضيات", ...]
```

**Transition:** Owner calls `StartGame` when all ready & ≥1 topic selected.

---

## Phase 3: Game Start

```
Owner ──WS──▶ StartGame(roomId, sessionId)

Backend
- Fetches questions from DB for selected topics
- Picks random first topic chooser
- Sets round counter to 0
```

**Branching:**

* **Multiple topics →** Phase = `ChoosingRoundTopic` → go to Phase 4
* **Single topic →** Phase = `CollectingAns` (skip topic selection) → go to Phase 5

```
Backend ──WS──▶ All Players
         ChooseRoundTopic(GameState)    ← if multiple topics
         GameStarted(GameState)         ← if single topic
```

---

## Phase 4: Topic Selection (`ChoosingRoundTopic`) — ⏱ 15s

> **Skipped entirely when only one topic is selected.**

```
One designated player must choose:

Topic Chooser ──WS──▶ SelectRoundTopic(roomId, topic)

Backend
- Validates topic choice
- Picks unused question for that topic

Backend ──WS──▶ All Players
         GameStarted(GameState)   ← phase = CollectingAns
```

**Timeout (15s):** Backend auto-selects a random valid topic. If no questions remain → `GameEnded`.

---

## Phase 5: Collecting Fake Answers (`CollectingAns`) — ⏱ 10–120s (default 30s)

```
All players see the question (correct answer hidden)

Players ──WS──▶ SubmitFakeAnswer(roomId, fakeAnswer)
         returns { success: true/false }

Backend
- Stores each player's fake answer
```

**Transition:** All players submitted OR timer expires.

```
Backend
- Shuffles fakes + correct answer into choices list

Backend ──WS──▶ All Players
         ShowChoices { choices, answerTimeSeconds, phaseDeadlineUtc }
```

---

## Phase 6: Choosing an Answer (`ChoosingAns`) — ⏱ 15s

```
Players see shuffled answer list (fakes + real answer)

Players ──WS──▶ ChooseAnswer(roomId, answer)
```

**Transition:** All players chose OR timer expires.

```
Backend
- Runs ScoreRound():
    +2 for choosing correct answer
    +1 per player fooled by your fake
- Reveals correct answer + explanation

Backend ──WS──▶ All Players
         RoundEnded(GameState)   ← phase = ShowingRanking
```

---

## Phase 7: Leaderboard (`ShowingRanking`) — ⏱ 5s

```
Frontend displays round results & leaderboard

Player ──WS──▶ NextRound(roomId)   ← or auto-advance after 5s
```

**Branching:**

```
Backend increments round counter

IF more rounds remain:
    Rotate topic chooser
    IF multiple topics → Phase 4 (ChooseRoundTopic)
    IF single topic   → Phase 5 (CollectingAns)
ELSE:
    → Phase 8 (Game End)
```

---

## Phase 8: Game End (`GameEnded`)

**Triggers:**

* All rounds completed
* Player count drops below 2 (minimum)
* No valid questions remain for any topic

**End-of-game sequence (ordered):**

```
Backend
1. Phase → GameEnded, cancel timer
2. SaveGameSession → DB (scores, ranks, XP for logged-in players)
3. Send targeted XpAwarded to each logged-in player's connection
4. Broadcast GameEnded(GameState) to all players
```

```
Backend ──WS──▶ Each logged-in player (targeted)
         XpAwarded { playerId, xpAwarded, totalXp, finalScore, finalRank }

Backend ──WS──▶ All Players
         GameEnded(GameState)   ← final scores
```

**Notes:**

* XP is persisted before results are announced
* Guest players appear on the leaderboard but have no DB records or XP
* Frontend updates localStorage XP on `XpAwarded`, then renders final screen on `GameEnded`

---

## Disconnection & Reconnection

```
SignalR detects disconnect:

Backend ──WS──▶ All Players
         PlayerDisconnected { sessionId, name, temporary: true, graceSeconds: 10 }

IF player reconnects within 10s:
    Player ──WS──▶ RejoinRoom(roomId, sessionId)
    Backend migrates connection, sends GameStateSync to caller

IF grace period expires:
    Backend removes player (same as explicit leave)
    Backend ──WS──▶ All Players
             PlayerDisconnected { sessionId, name }
```

**Explicit leave:**

```
Player ──WS──▶ LeaveRoom(roomId, sessionId)

Backend ──WS──▶ All Players
         PlayerLeft { sessionId, name }

IF last player → RoomClosed
IF owner left  → OwnershipTransferred to next player
IF < 2 players during game → GameEnded
```

---

## State Machine

```
Lobby
  ↓ StartGame
ChoosingRoundTopic ←──── (if multiple topics)
  ↓ topic selected         ↑
CollectingAns              │
  ↓ all fakes / timeout    │
ChoosingAns                │
  ↓ all chosen / timeout   │
ShowingRanking ────────────┘ (next round)
  ↓ last round
GameEnded
```

---

## Key Architectural Guarantees

* **Backend owns all timers, scoring, and state** — frontend renders projections only
* **REST for entry** — room creation, joining, lobby listing
* **SignalR for everything else** — all in-game events after `ConnectToRoom`
* **XP persisted before broadcast** — DB is updated before players see results
* **Reconnection-safe** — `RejoinRoom` + `GameStateSync` restores full state on any phase
