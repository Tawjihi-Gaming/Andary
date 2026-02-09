# Andary | Trivia Game

A web-based multiplayer trivia game built with React and Vite (frontend), with a planned ASP.NET C# backend and PostgreSQL database.

## Tech Stack

| Technology       | Version  | Role             |
|------------------|----------|------------------|
| React            | 19.2.0   | Frontend UI      |
| Vite             | 6.3.5    | Build tool       |
| Tailwind CSS     | 4.1.18   | Styling          |
| ESLint           | 9.39.1   | Linting          |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
cd frontend

# Create a production build
npm run build

# Preview the production build
npm run preview
```

### Linting

```bash
cd frontend
npm run lint
```

## Project Structure

```
FactFool/
├── documentation/           # Project documentation
│   ├── API_Documentation.md
│   ├── Game_Session_Flow.md
│   └── Technical_Design.md
├── frontend/                # React frontend
│   ├── public/              # Static assets (favicon)
│   ├── src/
│   │   ├── components/      # Reusable components (Auth, Logo)
│   │   ├── pages/           # Page components (LoginPage)
│   │   ├── App.jsx          # Root component
│   │   ├── index.css        # Global styles (Tailwind)
│   │   └── main.jsx         # Entry point
│   ├── index.html           # HTML template
│   ├── vite.config.js       # Vite configuration
│   ├── eslint.config.js     # ESLint configuration
│   └── package.json
├── .gitignore
├── LICENSE
└── README.md
```
