# Kalak | Game

A web-based game application built with React and Vite.

## Tech Stack

| Technology       | Version  |
|------------------|----------|
| React            | 19.2.0   |
| Vite             | 6.3.5    |
| Tailwind CSS     | 4.1.18   |
| ESLint           | 9.39.1   |
| Node.js          | 18+      |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)

### Installation

```bash

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
# Create a production build
npm run build

# Preview the production build
npm run preview
```

### Linting

```bash
npm run lint
```

## Project Structure

```
new-ui/
├── public/              # Static assets (favicon)
├── src/
│   ├── components/      # Reusable components (Logo, etc.)
│   ├── pages/           # Page components (LoginPage, etc.)
│   ├── assets/          # Images and other assets
│   ├── App.jsx          # Root component
│   ├── App.css          # App styles
│   ├── index.css        # Global styles (Tailwind)
│   └── main.jsx         # Entry point
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── eslint.config.js     # ESLint configuration
└── package.json
```
