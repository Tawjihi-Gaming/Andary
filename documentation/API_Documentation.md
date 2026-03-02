# API Documentation

## Overview

This API supports the multiplayer trivia game. It allows clients to manage authentication, rooms, friends, game history, and game configuration. Real-time game events are handled via WebSockets (SignalR).

## Authentication

Players can sign in using local email/password credentials or via Google OAuth. Authenticated sessions are managed through HTTP-only cookies (`jwt` and `refreshToken`). Some endpoints require authentication via the `[Authorize]` attribute. Anonymous players can join rooms without an account.

### Cookie-Based Auth

1. Player signs up or logs in
2. Server sets `jwt` and `refreshToken` HTTP-only cookies
3. Client includes cookies automatically on subsequent requests
4. On `401`, client should call `POST /api/auth/refresh-token` before redirecting to login

### Google OAuth

1. Client calls `GET /api/auth/google-login` to obtain the Google authorization URL
2. User is redirected to Google for consent
3. Google redirects back to `GET /api/auth/google/callback` with an authorization code
4. Server exchanges the code for tokens, creates or retrieves the player, sets auth cookies, and redirects to the frontend

## Endpoints

### Auth

#### POST /api/auth/signup

Register a new player using local credentials. A welcome email is sent in the background.

**Request:**

```json
{
  "username": "player_one",
  "email": "player@example.com",
  "password": "strongPassword123",
  "avatarImageName": "🦊"
}
```

| Field            | Type   | Required | Validation                                  |
|------------------|--------|----------|---------------------------------------------|
| `username`       | string | Yes      | Min 3 characters                            |
| `email`          | string | Yes      | Valid email format                           |
| `password`       | string | Yes      | Min 6 characters                            |
| `avatarImageName`| string | Yes      | Max 100 characters                          |

**Response (200):**

```json
{
  "msg": "Player created. Welcome email sent to email address."
}
```

#### POST /api/auth/login

Sign in an existing player using local credentials. Sets `jwt` and `refreshToken` cookies.

**Request:**

```json
{
  "email": "player@example.com",
  "password": "strongPassword123"
}
```

| Field      | Type   | Required | Validation        |
|------------|--------|----------|-------------------|
| `email`    | string | Yes      | Valid email format |
| `password` | string | Yes      |                   |

**Response (200):**

```json
{
  "msg": "Authentication successful",
  "id": 1,
  "username": "player_one",
  "avatarImageName": "🦊",
  "xp": 0,
  "email": "player@example.com"
}
```

#### GET /api/auth/me

Get the currently authenticated player's profile. Requires authentication.

**Response (200):**

```json
{
  "id": 1,
  "username": "player_one",
  "email": "player@example.com",
  "avatarImageName": "🦊",
  "xp": 0,
  "isGoogleUser": false
}
```

#### POST /api/auth/refresh-token

Refresh the JWT token using the `refreshToken` cookie. No request body required.

**Response (200):**

```json
{
  "msg": "Token refreshed"
}
```

#### GET /api/auth/google-login

Get the Google OAuth authorization URL to initiate login.

**Response (200):**

```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=openid email profile"
}
```

#### GET /api/auth/google/callback

Google OAuth callback endpoint. Exchanges the authorization code for tokens, creates or retrieves the player, sets auth cookies, and redirects to the frontend.

**Query Parameters:**

| Parameter | Type   | Required | Description                         |
|-----------|--------|----------|-------------------------------------|
| `code`    | string | Yes      | Authorization code from Google      |

**Response:** Redirects to the frontend (`/lobby?login=oauth` on success, `/login?error=...` on failure).

#### POST /api/auth/logout

Log out the current player. Clears auth cookies and invalidates the refresh token. Requires authentication.

**Response (200):**

```json
{
  "msg": "Logged out"
}
```

#### POST /api/auth/edit

Update the authenticated player's profile information. All fields are optional — only provided fields are updated. Requires authentication.

**Request:**

```json
{
  "username": "new_name",
  "email": "new@example.com",
  "password": "newPassword123",
  "avatarImageName": "🐻"
}
```

| Field            | Type   | Required | Validation                                       |
|------------------|--------|----------|--------------------------------------------------|
| `username`       | string | No       | Max 50 characters                                |
| `email`          | string | No       | Valid email format                               |
| `password`       | string | No       | Min 6 characters, must differ from current       |
| `avatarImageName`| string | No       | Max 100 characters                               |

**Response (200):**

```json
{
  "msg": "Player info updated"
}
```

#### POST /api/auth/forgot-password

Request a password reset link. The reset email is sent in the background.

**Request:**

```json
{
  "email": "player@example.com"
}
```

| Field   | Type   | Required | Validation        |
|---------|--------|----------|-------------------|
| `email` | string | Yes      | Valid email format |

**Response (200):**

```json
{
  "msg": "If an account with that email exists, a reset link has been sent"
}
```

#### POST /api/auth/reset-password

Reset password using the token received via the reset email.

**Request:**

```json
{
  "token": "reset-token-from-email",
  "newPassword": "newStrongPassword123"
}
```

| Field         | Type   | Required | Validation                    |
|---------------|--------|----------|-------------------------------|
| `token`       | string | Yes      |                               |
| `newPassword` | string | Yes      | Min 6 characters, max 100     |

**Response (200):**

```json
{
  "msg": "Password has been reset"
}
```

### Friends

All friend endpoints require authentication.

#### POST /api/friends/requests

Send a friend request to another player. If a reverse pending request exists, the friendship is automatically accepted.

**Request:**

```json
{
  "receiverId": 42
}
```

**Response (201):**

```json
{
  "id": 18,
  "sender": {
    "id": 7,
    "username": "player_one",
    "avatarImageName": "🦊"
  },
  "receiver": {
    "id": 42,
    "username": "player_two",
    "avatarImageName": "🐻"
  },
  "status": "pending",
  "createdAt": "2026-02-25T19:20:00Z"
}
```

#### DELETE /api/friends/requests/{receiverId}

Cancel a pending friend request sent by the authenticated player.

**Response (200):**

```json
{
  "msg": "Friend request canceled"
}
```

#### GET /api/friends/requests/incoming

List incoming pending friend requests for the authenticated player.

**Response (200):**

```json
[
  {
    "id": 22,
    "sender": {
      "id": 31,
      "username": "player_three",
      "avatarImageName": "🐱"
    },
    "receiver": {
      "id": 7,
      "username": "player_one",
      "avatarImageName": "🦊"
    },
    "status": "pending",
    "createdAt": "2026-02-25T18:05:00Z"
  }
]
```

#### GET /api/friends/requests/sent

List pending friend requests sent by the authenticated player.

**Response (200):**

```json
[
  {
    "id": 25,
    "sender": {
      "id": 7,
      "username": "player_one",
      "avatarImageName": "🦊"
    },
    "receiver": {
      "id": 55,
      "username": "player_five",
      "avatarImageName": "🐶"
    },
    "status": "pending",
    "createdAt": "2026-02-25T18:30:00Z"
  }
]
```

#### POST /api/friends/requests/{requestId}/accept

Accept an incoming friend request. Only the receiver can accept.

**Response (200):**

```json
{
  "friendshipId": 11,
  "player": {
    "id": 31,
    "username": "player_three",
    "avatarImageName": "🐱"
  },
  "since": "2026-02-25T19:25:00Z"
}
```

#### POST /api/friends/requests/{requestId}/reject

Reject an incoming friend request. Only the receiver can reject.

**Response (200):**

```json
{
  "msg": "Friend request rejected"
}
```

#### GET /api/friends

List all friends of the authenticated player.

**Response (200):**

```json
[
  {
    "friendshipId": 11,
    "player": {
      "id": 31,
      "username": "player_three",
      "avatarImageName": "🐱"
    },
    "since": "2026-02-25T19:25:00Z"
  },
  {
    "friendshipId": 12,
    "player": {
      "id": 42,
      "username": "player_two",
      "avatarImageName": "🐻"
    },
    "since": "2026-02-24T12:10:00Z"
  }
]
```

#### DELETE /api/friends/{friendId}

Remove an existing friendship. Only a member of the friendship can remove it.

**Response (200):**

```json
{
  "msg": "Friend removed"
}
```

### Room

#### POST /api/room/create

Create a new room and automatically join the creator as the owner.

**Request:**

```json
{
  "isPrivate": false,
  "questions": 10,
  "name": "Ali's Room",
  "playerName": "Ali",
  "avatarImageName": "🦊",
  "playerId": 1,
  "clientKey": "browser-identity-key",
  "selectedTopics": ["رياضيات", "فيزياء"],
  "answerTimeSeconds": 30
}
```

| Field              | Type     | Required | Description                                            |
|--------------------|----------|----------|--------------------------------------------------------|
| `isPrivate`        | boolean  | Yes      | Whether the room is private                            |
| `questions`        | integer  | Yes      | Number of questions for the game                       |
| `name`             | string   | Yes      | Room display name                                      |
| `playerName`       | string   | Yes      | Creator's display name                                 |
| `avatarImageName`  | string   | No       | Creator's avatar                                       |
| `playerId`         | integer  | No       | Set if the creator is logged in                        |
| `clientKey`        | string   | No       | Browser identity key (used for guest deduplication)    |
| `selectedTopics`   | string[] | No       | Topics chosen at room creation (max 7)                 |
| `answerTimeSeconds`| integer  | No       | Per-question timer in seconds (default: 30)            |

**Response (200):**

```json
{
  "roomId": "guid",
  "code": "123456",
  "name": "Ali's Room",
  "sessionId": "guid",
  "playerName": "ali",
  "answerTimeSeconds": 30
}
```

#### POST /api/room/join

Join an existing room. Supports both logged-in players (with `playerId`) and anonymous guests. Rooms can be joined by room code (public/private) or by room ID (public only).

**Request:**

```json
{
  "roomId": "guid",
  "playerId": 1,
  "playerName": "Guest Player",
  "avatarImageName": "🐻",
  "clientKey": "browser-identity-key",
  "code": "123456"
}
```

| Field            | Type    | Required | Description                                             |
|------------------|---------|----------|---------------------------------------------------------|
| `roomId`         | string  | No       | Room ID (for public rooms); provide `code` or `roomId`  |
| `playerId`       | integer | No       | Set if the player is logged in                          |
| `playerName`     | string  | Yes      | Display name                                            |
| `avatarImageName`| string  | No       | Player's avatar                                         |
| `clientKey`      | string  | No       | Browser identity key (used for guest deduplication)     |
| `code`           | string  | No       | Room code (works for public/private); provide `code` or `roomId` |

**Response (200):**

```json
{
  "roomId": "guid",
  "code": "123456",
  "isPrivate": false,
  "roomType": "Public",
  "name": "Ali's Room",
  "sessionId": "guid",
  "playerName": "Guest Player",
  "answerTimeSeconds": 30
}
```

#### GET /api/room/{roomId}

Get info about a specific room, including players and current config. Room IDs are GUID strings.

**Response (200):**

```json
{
  "roomId": "guid",
  "name": "Ali's Room",
  "code": "123456",
  "isPrivate": false,
  "roomType": "Public",
  "ownerSessionId": "guid",
  "phase": "Lobby",
  "players": [
    {
      "sessionId": "guid",
      "name": "Ali",
      "avatarImageName": "🦊",
      "score": 0,
      "isReady": false
    }
  ],
  "totalQuestions": 10,
  "selectedTopics": ["رياضيات", "فيزياء"],
  "answerTimeSeconds": 30
}
```

#### GET /api/room/lobbies

List all available public lobbies. Supports optional long polling.

**Query Parameters:**

| Parameter | Type    | Required | Description                                                                 |
|-----------|---------|----------|-----------------------------------------------------------------------------|
| `wait`    | boolean | No       | If `true`, the server holds the request until lobbies change or timeout.    |

**Behavior:**

- `wait` not provided or `false`: returns the current lobby list immediately.
- `wait=true`: long-polls for up to 30 seconds. Returns `200` with updated data when a change occurs, or `204 No Content` if the timeout is reached with no changes.

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

#### GET /api/room/topics

Get the list of available game topics.

**Response (200):**

```json
["English", "رياضيات", "فيزياء", "كيمياء", "أحياء", "عربي"]
```

### History

#### GET /api/history/{playerId}

Get game history for a specific player. Supports pagination. Requires authentication.

**Path Parameters:**

| Parameter  | Type    | Required | Description          |
|------------|---------|----------|----------------------|
| `playerId` | integer | Yes      | The player's ID      |

**Query Parameters:**

| Parameter    | Type    | Required | Default | Description                  |
|--------------|---------|----------|---------|------------------------------|
| `pageNumber` | integer | No       | 1       | Page number (1-based)        |
| `pageSize`   | integer | No       | 10      | Number of results per page   |

**Response (200):**

```json
[
  {
    "gameSessionId": 5,
    "finalScore": 750,
    "finalRank": 2,
    "endDate": "2026-02-20T15:30:00Z",
    "totalRounds": 10
  }
]
```

**Response (204):**

No content. Returned when no game history is found for the given player.

### Game Loop / Questions

Most live game events (questions, answer submissions, rankings) are handled via WebSocket messages (SignalR).

## Error Handling

The API returns standard HTTP status codes:

* `200` - Success
* `201` - Created
* `204` - No Content
* `400` - Bad Request
* `401` - Unauthorized
* `403` - Forbidden
* `404` - Not Found
* `409` - Conflict
* `500` - Internal Server Error

**Error Response Format:**

```json
{
  "msg": "Description of the error"
}
```
