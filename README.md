# ProFootball Backend - Real-time Match Center

A high-performance real-time football match center built with NestJS, TypeORM (Supabase), Redis, and Socket.io.

## Features

- **Live Match Simulation**: Real-time background service that simulates matches (1s = 1 match minute) with realistic event distributions (Goals, Cards, Subs, etc.).
- **Real-time Updates**: Room-based Socket.io communication for score updates, match events, and statistics.
- **Match Events Stream**: Server-Sent Events (SSE) endpoint for streaming match events as they happen.
- **Chat Rooms**: Match-specific chat rooms with active user tracking and typing indicators.
- **REST API**: Clean, versioned endpoints for match listings and detailed match data.

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL (Supabase) via TypeORM
- **Real-time**: Socket.io & SSE
- **In-Memory Store**: Redis (for chat tracking and typing indicators)
- **Validation**: class-validator & class-transformer

## Architecture Decisions

- **Event-Driven Simulation**: The `MatchSimulationService` uses a heartbeat (Cron every second) to tick match time and emit events via NestJS `EventEmitter2`. This decoupled approach allows multiple modules (Gateway, SSE, etc.) to react to match changes without direct dependencies.
- **Room-Based Messaging**: Socket.io rooms are used to ensure clients only receive updates for the matches they are currently viewing, maximizing broadcast efficiency.
- **SSE for Lightweight Events**: While WebSocket is used for interactive features (chat), SSE is provided as a secondary, lightweight stream for match events history and live updates.
- **Redis for Volatile State**: Active user counts and typing indicators are stored in Redis with TTLs, ensuring the server remains stateless and can scale horizontally.

## Setup Instructions

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your Supabase and Redis credentials.
4. **Run the application**:
   ```bash
   npm run start:dev
   ```

## API Documentation

### REST Endpoints
- `GET /api/matches`: List all live/upcoming matches.
- `GET /api/matches/:id`: Detailed match info + current statistics.
- `GET /api/matches/:id/events/stream`: SSE stream for live match events.

### WebSocket (Socket.io)
- **Join/Leave Match**: `joinMatch` / `leaveMatch` (payload: `matchId`)
- **Chat**: `sendMessage` (payload: `{ matchId, message }`)
- **Typing**: `typing` (payload: `{ matchId, isTyping }`)

## Known Limitations / Trade-offs

- **Network Instability**: Due to environment limitations during development, automated build verification was partially constrained.
- **Match Lifecycle**: The simulation transitions through stages (FIRST_HALF, HALF_TIME, etc.) but does not yet handle complex injury time logic.
