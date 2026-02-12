# Kalak Frontend Test

This project is a simple front-end application designed to test the backend for a web application similar to the Kalak.gg game. It includes essential components for a multiplayer game, such as a lobby, game board, and scoreboard.

## Project Structure

```
kalak-frontend-test
├── src
│   ├── index.html          # Main HTML document
│   ├── css
│   │   └── styles.css      # Styles for the application
│   ├── js
│   │   ├── main.js         # Main JavaScript file
│   │   ├── api.js          # API calls to the backend
│   │   └── game.js         # Game logic
│   └── components
│       ├── lobby.js        # Lobby component
│       ├── game-board.js   # Game board component
│       └── scoreboard.js    # Scoreboard component
├── package.json            # npm configuration file
└── README.md               # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd kalak-frontend-test
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Open `src/index.html` in your web browser to view the application.

## Usage

- Players can register in the lobby and join the game.
- The game board displays the current state of the game.
- The scoreboard updates in real-time as players take actions.

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.