#  ProFootball Backend - Real-time Match Center

A high-performance real-time football match center built with **NestJS**, **TypeORM (Supabase)**, **Redis**, and **Socket.io**. This backend powers live score updates, match event streams, and real-time chat functionality for football fans.

---

##  Quick Start & Setup

Follow these steps to get your development environment up and running.

### 1. Prerequisites
- **Node.js**: v22.x or later
- **npm**: v11.x or later
- **Redis**: v7.x or later
- **PostgreSQL**: Accessible instance (Supabase recommended)

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>
cd pro-football

# Install dependencies (utilizes npm overrides for NestJS 11 compatibility)
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and populate it based on `.env.example`:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DB_HOST` | Supabase Database Host | `localhost` |
| `DB_PORT` | Database Port | `5432` |
| `REDIS_HOST` | Redis Server Host | `localhost` |
| `REDIS_PORT` | Redis Server Port | `6379` |
| `PORT` | Application Port | `3000` |

### 4. Running the App
```bash
# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod
```

---

## 🏛️ Architecture Decisions

### ⚡ Event-Driven Simulation
The `MatchSimulationService` uses a decoupled heartbeat mechanism. It emits events via NestJS `EventEmitter2`, allowing multiple subscribers (Gateways, Logs) to react independently. 
- **Time Logic**: 1 real second = 1 game minute.
- **Event Engine**: Probability-based event generation (goals, cards, substitutions).

### 🔄 Real-time Strategy
- **Socket.io Rooms**: Optimized for performance; clients only receive updates for matches they are "joined" to.
- **Redis State**: Volatile user data (active counts, typing indicators) is stored in Redis with TTLs. This ensures the server remains stateless and ready for horizontal scaling.
- **SSE for Data Streams**: A dedicated Server-Sent Events endpoint provides a lightweight, read-only stream for live match timelines.

---

## 📖 API Documentation

The absolute source of truth for our API is the Swagger documentation.

- **Interactive Documentation**: `http://localhost:{{PORT}}/api/docs`

### 🛠️ REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/matches` | List all active and upcoming matches |
| `GET` | `/api/matches/:id` | Get detailed match state and statistics |
| `GET` | `/api/matches/:id/events/stream` | SSE endpoint for live event timeline |

### 🔌 WebSocket (Socket.io)

**Namespace: Default**

#### Incoming Events (Client → Server)

| Event | Payload | Description |
| :--- | :--- | :--- |
| `joinMatch` | `{ "matchId": "uuid", "userId": "string" }` | Join a match's real-time room and chat. |
| `leaveMatch` | `{ "matchId": "uuid", "userId": "string" }` | Leave the match room. |
| `sendMessage` | `{ "message": "string" }` | Send a message to the match chat (max 280 chars). |
| `typing` | `{ "isTyping": boolean }` | Update your typing status in the match room. |

#### Outgoing Events (Server → Client)

| Event | Channel | Payload Description |
| :--- | :--- | :--- |
| `joined` | Sender | `{ "matchId": string, "userId": string, "count": number }` - Confirmation of successful join. |
| `userJoined` | Room | `{ "userId": string }` - Notifies room that a new user has entered. |
| `userLeft` | Room | `{ "userId": string }` - Notifies room that a user has departed. |
| `userCountUpdate` | Room | `{ "matchId": string, "count": number }` - Real-time active user count for the match. |
| `matchUpdated` | Room | `Match` object - Full update when match score or state changes. |
| `newEvent` | Room | `MatchEvent` object - Real-time notification of a specific goal, card, or sub. |
| `chatMessage` | Room | `{ "userId": string, "message": string, "timestamp": string }` - New message in chat. |
| `typingUpdate` | Others | `{ "matchId": string, "users": string[] }` - List of userIds currently typing. |
| `error` | Sender | `{ "message": string, "details?": string }` - Error notification for failed actions. |

---

## ⚠️ Known Limitations & Trade-offs

- **NestJS 11 Peer Dependencies**: Because of `@liaoliaots/nestjs-redis` (v10) strict peer dependency on NestJS 10, an **npm override** is used in `package.json` to ensure compatibility with NestJS 11.
- **Match Lifecycle**: Injury time is currently simplified to fixed durations.
- **Stateless Gateways**: While the server is mostly stateless via Redis, Socket.io session stickiness should be considered for multi-node deployments.
