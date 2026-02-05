# API Documentation

## Overview

This API supports the trivia multiplayer trivia game. It allows clients to manage lobbies, players, game configuration, and retrieve game-related data. Real-time game events are handled via WebSockets.

## Authentication

Players can optionally sign in using OAuth or play anonymously by providing a name. OAuth tokens or session IDs are used to identify players for persistent data.

### OAuth 2.0

1. Register your application
2. Get authorization code
3. Exchange for access token

## Endpoints

### Players

#### GET /players/{id}

Retrieve a specific player's info.

**Parameters:**

* `id` (required): Player ID

**Response:**

```json
{
  "id": "123",
  "username": "Player1",
  "avatar_image_name": "avatar.png",
  "created_at": "2026-02-04T18:00:00Z"
}
```

#### POST /players

Create or update a player profile (for sign-in).

**Request Body:**

```json
{
  "username": "Player1",
  "avatar_image_name": "avatar.png"
}
```

**Response:**

```json
{
  "id": "123",
  "username": "Player1",
  "avatar_image_name": "avatar.png",
  "created_at": "2026-02-04T18:00:00Z"
}
```

### Lobbies

#### GET /lobbies

List all available lobbies.

**Response:**

```json
{
  "lobbies": [
    {"id": "1", "owner_id": "123", "status": "waiting"}
  ]
}
```

#### POST /lobbies

Create a new lobby.

**Request Body:**

```json
{
  "owner_id": "123",
  "config": {"topics": ["Science", "History"], "timer": 30}
}
```

**Response:**

```json
{
  "id": "1",
  "owner_id": "123",
  "status": "waiting",
  "config": {"topics": ["Science", "History"], "timer": 30},
  "created_at": "2026-02-04T18:00:00Z"
}
```

#### GET /lobbies/{id}

Get info about a specific lobby, including players and current config.

#### POST /lobbies/{id}/join

Join a specific lobby.

**Request Body:**

```json
{
  "player_id": "124"
}
```

**Response:**

```json
{
  "message": "Player joined lobby",
  "lobby_id": "1",
  "player_id": "124"
}
```

#### POST /lobbies/{id}/leave

Leave a lobby.

**Request Body:**

```json
{
  "player_id": "124"
}
```

**Response:**

```json
{
  "message": "Player left lobby",
  "lobby_id": "1",
  "player_id": "124"
}
```

### Game Configuration

#### GET /lobbies/{id}/config

Retrieve the current configuration for the lobby.

#### PUT /lobbies/{id}/config

Update game configuration (room owner only).

**Request Body:**

```json
{
  "topics": ["Science", "History"],
  "timer": 30
}
```

**Response:**

```json
{
  "message": "Game configuration updated",
  "lobby_id": "1",
  "config": {"topics": ["Science", "History"], "timer": 30}
}
```

### Game Loop / Questions

Most live game events (questions, answer submissions, rankings) are handled via WebSocket messages:

* `player_joined` / `player_left`
* `start_game`
* `select_topic`
* `start_question_round`
* `submit_fake_answer`
* `select_answer`
* `answer_selected`
* `round_results`
* `game_finished`

## Error Handling

The API returns standard HTTP status codes:

* `200` - Success
* `201` - Created
* `400` - Bad Request
* `401` - Unauthorized
* `404` - Not Found
* `500` - Internal Server Error

**Error Response Format:**

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid",
    "details": "Additional error details"
  }
}
```
