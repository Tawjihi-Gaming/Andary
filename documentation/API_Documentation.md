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

### Friends

#### POST /api/friends/requests

Send a friend request to another player.

**Request:**

```json
{
  "receiverId": 42
}
```

**Response:**

```json
{
  "id": 18,
  "sender": {
    "id": 7,
    "username": "player_one",
    "avatarImageName": "avatar1.png"
  },
  "receiver": {
    "id": 42,
    "username": "player_two",
    "avatarImageName": "avatar2.png"
  },
  "status": "pending",
  "createdAt": "2026-02-25T19:20:00Z"
}
```

#### DELETE /api/friends/requests/{receiverId}

Cancel a pending friend request sent by the authenticated player.

**Response:**

```json
{
  "msg": "Friend request canceled"
}
```

#### GET /api/friends/requests/incoming

List incoming pending friend requests for the authenticated player.

**Response:**

```json
[
  {
    "id": 22,
    "sender": {
      "id": 31,
      "username": "player_three",
      "avatarImageName": "avatar3.png"
    },
    "receiver": {
      "id": 7,
      "username": "player_one",
      "avatarImageName": "avatar1.png"
    },
    "status": "pending",
    "createdAt": "2026-02-25T18:05:00Z"
  }
]
```

#### GET /api/friends/requests/sent

List pending friend requests sent by the authenticated player.

**Response:**

```json
[
  {
    "id": 25,
    "sender": {
      "id": 7,
      "username": "player_one",
      "avatarImageName": "avatar1.png"
    },
    "receiver": {
      "id": 55,
      "username": "player_five",
      "avatarImageName": "avatar5.png"
    },
    "status": "pending",
    "createdAt": "2026-02-25T18:30:00Z"
  }
]
```

#### POST /api/friends/requests/{requestId}/accept

Accept an incoming friend request.

**Response:**

```json
{
  "friendshipId": 11,
  "player": {
    "id": 31,
    "username": "player_three",
    "avatarImageName": "avatar3.png"
  },
  "since": "2026-02-25T19:25:00Z"
}
```

#### POST /api/friends/requests/{requestId}/reject

Reject an incoming friend request.

**Response:**

```json
{
  "msg": "Friend request rejected"
}
```

#### GET /api/friends

List all friends of the authenticated player.

**Response:**

```json
[
  {
    "friendshipId": 11,
    "player": {
      "id": 31,
      "username": "player_three",
      "avatarImageName": "avatar3.png"
    },
    "since": "2026-02-25T19:25:00Z"
  },
  {
    "friendshipId": 12,
    "player": {
      "id": 42,
      "username": "player_two",
      "avatarImageName": "avatar2.png"
    },
    "since": "2026-02-24T12:10:00Z"
  }
]
```

#### DELETE /api/friends/{friendId}

Remove an existing friendship.

**Response:**

```json
{
  "msg": "Friend removed"
}
```

### Friends

#### POST /api/friends/requests

Send a friend request to another player.

**Request:**

```json
{
  "receiverId": 42
}
```

**Response:**

```json
{
  "id": 18,
  "sender": {
    "id": 7,
    "username": "player_one",
    "avatarImageName": "avatar1.png"
  },
  "receiver": {
    "id": 42,
    "username": "player_two",
    "avatarImageName": "avatar2.png"
  },
  "status": "pending",
  "createdAt": "2026-02-25T19:20:00Z"
}
```

#### DELETE /api/friends/requests/{receiverId}

Cancel a pending friend request sent by the authenticated player.

**Response:**

```json
{
  "msg": "Friend request canceled"
}
```

#### GET /api/friends/requests/incoming

List incoming pending friend requests for the authenticated player.

**Response:**

```json
[
  {
    "id": 22,
    "sender": {
      "id": 31,
      "username": "player_three",
      "avatarImageName": "avatar3.png"
    },
    "receiver": {
      "id": 7,
      "username": "player_one",
      "avatarImageName": "avatar1.png"
    },
    "status": "pending",
    "createdAt": "2026-02-25T18:05:00Z"
  }
]
```

#### GET /api/friends/requests/sent

List pending friend requests sent by the authenticated player.

**Response:**

```json
[
  {
    "id": 25,
    "sender": {
      "id": 7,
      "username": "player_one",
      "avatarImageName": "avatar1.png"
    },
    "receiver": {
      "id": 55,
      "username": "player_five",
      "avatarImageName": "avatar5.png"
    },
    "status": "pending",
    "createdAt": "2026-02-25T18:30:00Z"
  }
]
```

#### POST /api/friends/requests/{requestId}/accept

Accept an incoming friend request.

**Response:**

```json
{
  "friendshipId": 11,
  "player": {
    "id": 31,
    "username": "player_three",
    "avatarImageName": "avatar3.png"
  },
  "since": "2026-02-25T19:25:00Z"
}
```

#### POST /api/friends/requests/{requestId}/reject

Reject an incoming friend request.

**Response:**

```json
{
  "msg": "Friend request rejected"
}
```

#### GET /api/friends

List all friends of the authenticated player.

**Response:**

```json
[
  {
    "friendshipId": 11,
    "player": {
      "id": 31,
      "username": "player_three",
      "avatarImageName": "avatar3.png"
    },
    "since": "2026-02-25T19:25:00Z"
  },
  {
    "friendshipId": 12,
    "player": {
      "id": 42,
      "username": "player_two",
      "avatarImageName": "avatar2.png"
    },
    "since": "2026-02-24T12:10:00Z"
  }
]
```

#### DELETE /api/friends/{friendId}

Remove an existing friendship.

**Response:**

```json
{
  "msg": "Friend removed"
}
```

### Room

#### GET /api/room/lobbies

List all available public lobbies. Supports optional long polling.

**Query Parameters:**

| Parameter | Type    | Required | Description                                                                 |
|-----------|---------|----------|-----------------------------------------------------------------------------|
| `wait`    | boolean | No       | If `true`, the server holds the request until lobbies change or timeout.    |

**Behavior:**

- `wait` not provided or `false`: returns the current lobby list immediately.
- `wait=true`: long-polls for up to 25 seconds. Returns `200` with updated data when a change occurs, or `204 No Content` if the timeout is reached with no changes.

**Response (200):**

```json
[
  {
    "id": "guid",
    "roomId": "guid",
    "name": "Ali's Room",
    "code": "123456",
    "players": 2,
    "maxPlayers": 6,
    "topic": "رياضيات، فيزياء",
    "status": "waiting",
    "ownerSessionId": "guid",
    "ownerName": "Ali",
    "answerTimeSeconds": 30
  }
]
```

**Response (204):**

No content. Returned when `wait=true` and the timeout is reached without lobby changes.

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
