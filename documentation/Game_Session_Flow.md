# Game Session Flow (Start → Finish)

This diagram describes the **complete lifecycle of a game session**, from creation to termination, and how players, the game session owner, REST APIs, and WebSockets interact.

---

## Actors

* **Player**: Any participant in the game
* **Game Session Owner**: Special player who controls configuration and game start
* **Frontend (React)**: UI and cached state
* **Backend (ASP.NET)**: Authoritative game logic
* **WebSocket (SignalR)**: Real-time communication channel

---

## Phase 1: Session Creation / Joining

```
Player ──REST──▶ Backend
        Create or Join Game

Backend ──REST──▶ Player
        sessionID
        playerID
        gameConfig
        lobbySnapshot

Frontend
- Caches player info
- Establishes WebSocket connection
```

**Notes**:

* WebSocket is established immediately after create/join
* Backend creates in-memory `GameSession`

---

## Phase 2: Lobby / Configuration

```
Game Session Owner
- Sets gameConfig (timers, topics, rounds)

Owner ──WS──▶ Backend
        Update config

Backend ──WS──▶ All Players
        game:configUpdated
```

```
Players ──WS──▶ Backend
        player:ready

Backend ──WS──▶ All Players
        lobby:update
```

**Transition Condition**:

* All players are ready
* Owner triggers game start

---

## Phase 3: Game Start

```
Owner ──WS──▶ Backend
        start_game

Backend
- Locks config
- Initializes round counter
- Selects starting player

Backend ──WS──▶ All Players
        start_game
```

---

## Phase 4: Topic Selection

```
Current Player ──WS──▶ Backend
        select_topic

Backend
- Validates topic
- Randomly selects question
```

---

## Phase 5: Fake Answer Input (First Timer)

```
Backend ──WS──▶ All Players
        start_question_round
        (timestamp + duration)

Players ──WS──▶ Backend
        submit_fake_answer

Backend
- Collects fake answers
- Auto-submits empty on timeout
```

**Transition Condition**:

* All players submitted
* OR timer expires

---

## Phase 6: Answer Selection (Second Timer)

```
Backend
- Adds correct answer
- Shuffles all answers

Backend ──WS──▶ All Players
        select_answer
        (answer options)

Players ──WS──▶ Backend
        answer_selected
```

**Transition Condition**:

* All players selected
* OR timer expires

---

## Phase 7: Scoring & Results

```
Backend
- Calculates scores
- Updates player state

Backend ──WS──▶ All Players
        round_results
```

Frontend

* Updates cached scores
* Displays leaderboard

---

## Phase 8: Round Progression

```
Backend
- Increment round counter

IF roundsRemaining:
    Select next topic chooser
    Go to Phase 4
ELSE:
    Go to Phase 9
```

---

## Phase 9: Game End

```
Backend
- Finalizes scores
- Persists summary to DB

Backend ──WS──▶ All Players
        game_finished
```

Frontend

* Displays final ranking
* Option to exit or replay

---

## State Machine Summary

```
LOBBY
  ↓
CONFIGURED
  ↓
RUNNING
  ├─ Topic Selection
  ├─ Fake Answer Input
  ├─ Answer Selection
  ├─ Scoring
  └─ Next Round
  ↓
FINISHED
```

---

## Key Architectural Guarantees

* Backend owns all timers and scoring
* Frontend renders cached projections only
* WebSockets handle all live transitions
* REST is used for entry and recovery only
