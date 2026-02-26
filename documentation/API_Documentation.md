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

### Auth

#### POST /api/auth/register

Register a new player.

**Request:**

```json
{
  "method": "local",
  "email": "123@gmail.com",
  "password": "123pass",
  "username": "Player1",
  "avatar_image_name": "avatar.png"
}
```
```json
{
  "method": "oauth",
  "provider": "google",
  "oauth_token": "toekn",
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

#### POST /api/auth/login

sign-in an existing player.

**Request:**

```json
{
  "method": "local",
  "email": "123@gmail.com",
  "password": "123pass"
}
```
```json
{
  "method": "oauth",
  "provider": "google",
  "oauth_token": "toekn"
}
```

**Response:**

```json
{
  "id": "123",
  "username": "Player1",
  "avatar_image_name": "avatar.png"
}
```

#### POST /api/auth/forgot-password

Request a password reset link.

**Request:**

```json
{
  "email": "123@gmail.com"
}
```

**Response:**

```json
{
  "msg": "If an account with that email exists, a reset link has been sent"
}
```

#### POST /api/auth/reset-password

Reset password using the token from the reset link.

**Request:**

```json
{
  "token": "reset-token-from-email",
  "newPassword": "newStrongPassword123"
}
```

**Response:**

```json
{
  "msg": "Password has been reset"
}
```

### lobby

#### GET /api/lobby

List all available lobby.

**Response:**

```json
{
  "lobby1": [
    {"id": "1", "owner_id": "123", "status": "waiting"}
  ], "lobby2": [...]
}
```

#### POST /api/lobby

Create a new lobby.

**Request:**

```json
{
  "owner_id": "123",
  "visablity": "public"
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

#### GET /api/lobby/{id}

Get info about a specific lobby, including players and current config.

#### POST /api/lobby/{id}/join

Join a specific lobby.

**Request:**

```json
{
  "player_id": "123", // if the player is logged in
  "username": "player name",
  "avatar_image_name": "avatar.png"
}
```

**Response:**

```json
{
  "message": "Player joined lobby",
  "lobby_id": "1",
  "player_session_id": "124"
}
```

### Game Loop / Questions

Most live game events (questions, answer submissions, rankings) are handled via WebSocket messages.

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
