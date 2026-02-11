# Trivia Game Technical Design Document

## Overview

This document describes the architecture, components, and flow of a trivia online multiplayer game. The design is intended for clarity while also providing technical details for implementation.

### Project Goals

* Implement a multiplayer trivia game accessible via web.
* Provide a simple and clear game flow.
* Support anonymous play or optional sign-in.
* Maintain real-time communication between players and server using WebSockets.

### Technology Stack

* **Front-end:** React
* **Back-end:** ASP.NET C#
* **Real-time Communication:** WebSockets
* **Database:** PostgreSQL

## High-Level Architecture

```
+----------------+      WebSocket      +------------------+
|                | <----------------> |                  |
|  React Client  |                    |  ASP.NET Server  |
|                | ---------------->  |                  |
+----------------+     REST APIs       +------------------+
                                                |
                                                v
                                       +------------------+
                                       | PostgreSQL DB    |
                                       +------------------+
```

### Main Components

1. **Client (React)**

   * Lobby management (create/join)
   * Player info (name, avatar)
   * Game configuration page (topics, timer, etc.)
   * Game loop UI (question submission, answer selection, rankings)
   * WebSocket communication for live game updates

2. **Server (ASP.NET C#)**

   * WebSocket handling
   * Game session management
   * Player management
   * Game configuration validation and storage
   * Game loop orchestration
   * Database interaction for persistent storage

3. **Database (PostgreSQL)**

   * Players table
   * Game sessions table
   * Game history table
   * Questions table

## [Database Schema](https://dbdiagram.io/d/69835df1bd82f5fce2a47c96)

## Game Flow

### 1. Lobby Flow

1. Player opens the website.
2. Player can create a new lobby or join an existing one.
3. Player can optionally sign in or enter a name and choose an avatar.
4. WebSocket connection is established.
5. Room owner selects game configuration (topics, timers).
6. Players indicate readiness.
7. Configuration is sent to backend.

### 2. Game Loop

**Stages per round:**

1. **Question Submission Stage:**

   * Server broadcasts a question.
   * Players submit incorrect/misleading answers.
   * Move to next stage when all players submit or timer expires.

2. **Answer Selection Stage:**

   * Question and all submitted answers are shown.
   * Players choose an answer.
   * Move to next stage when all players submit or timer expires.

3. **Ranking Stage:**

   * Correct answer is revealed with explanation.
   * Rankings for this round are calculated and displayed.

4. Repeat for all rounds.

5. After all rounds, game ends and results are stored.

6. Optionally, players return to game config page to start a new game.

## WebSocket Communication

* Establish a persistent connection for each player.
* Events:

  * `player_joined` / `player_left`
  * `player_ready` / `player_not_ready`
  * `update_game_config` / `game_config_updated`
  * `start_game`
  * `selecting_topic` / `select_topic` / `topic_selcted`
  * `start_question_round`
  * `submit_fake_answer` / `answers_submitted`
  * `select_answer` / `answer_selected`
  * `results`
  * `game_finished`

## Directory Structure Suggestion

```
/trivia-game
│
├── frontend/         # React project
│   ├── components/
│   ├── pages/
│   └── websocket/
│
└── backend/          # ASP.NET project
    ├── Controllers/
    ├── Models/
    ├── Services/
    └── WebSockets/
```

## DevOps / Deployment

### Overview

The project uses a containerized architecture with one container per service. Deployment is handled via Docker and orchestrated using Docker Compose. NGINX is used as a reverse proxy to enforce HTTPS for all communication.

### CI/CD

GitHub Actions is used for continuous integration and deployment.

**Build & Deployment Steps:**

1. Build and start all services:

```bash
docker compose build
```

```bash
docker compose up
```

2. Configure NGINX for HTTPS routing.
3. [Additional deployment steps: ]

### Environments

* **Development:**
  [Details to be added]
* **Production:**
  [Details to be added]

## Authentication

Players will be able to use **email and password** or **Oauth2.0** to login/register.

Authentication is used only to establish player identity at lobby entry; during gameplay all participants are treated uniformly using session-scoped player identifiers.

## Notes

* Focus on the **happy path** first: normal player flow, game loop, and rankings.
* Error handling enforcement, and edge cases will be added later.
* Use WebSocket events consistently for all live game updates.
* Keep backend services modular: separation of game session management, player handling, and question logic.
