# Aviation Knowledge Bot

Telegram bot for daily aviation knowledge delivery with AI-powered content generation.

## Project Structure

```
.
├── backend/          # Backend Node.js application
│   ├── src/          # Source code
│   └── admin/        # Legacy admin (deprecated)
├── frontend/         # Vue 3 admin interface
│   ├── src/          # Vue source code
│   └── dist/         # Build output (generated)
└── docs/             # Documentation
```

## Development

### Backend

```bash
npm install
npm run dev          # Start backend with nodemon
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # Start frontend dev server on port 5173
```

### Both (in separate terminals)

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:frontend
```

The frontend dev server proxies API requests to `http://localhost:3010`.

## Production Build

```bash
# Build frontend
npm run build:frontend

# Start backend (serves frontend build)
npm start
```

## Docker

```bash
docker-compose up -d
```

This will build both frontend and backend and serve them together.

## Admin Interface

Access the admin interface at:
- Development: `http://localhost:5173`
- Production: `http://localhost:3010`
