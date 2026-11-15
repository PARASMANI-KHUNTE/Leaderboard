# EliteBoards

EliteBoards is a high-performance, real-time full-stack leaderboard platform featuring a React 19 web client, an Expo SDK 55 mobile app, and an Express 5 + MongoDB + Redis backend.

---

## Workspace Structure

```
├── .github/workflows/          # CI/CD Workflows
│   ├── ci.yml                  # Linting, unit tests, concurrency tests, mobile Hermes export
│   ├── cd.yml                  # Render deployment trigger, health polling, Expo EAS OTA updates
│   └── security.yml            # GitHub CodeQL Advanced Security scanning
├── client/Leaderboard/         # Web Application (React 19, Vite, Tailwind CSS, Lucide)
├── server/                     # Backend API (Express 5, MongoDB, Redis, Socket.IO)
│   ├── config/                 # Database & fail-fast Redis configuration with circuit breaker
│   ├── models/                 # Mongoose schemas with compound uniqueness & indexes
│   ├── routes/                 # REST endpoints with distributed mutex & coalescing cache
│   ├── test/                   # Automated unit, validation, and high-concurrency stress tests
│   └── utils/                  # Redis composite score ranking engine & push notifications
├── mobile/eliteboards-mobile/  # Mobile Application (Expo SDK 55, Expo Router, TanStack Query)
└── docs/                       # Engineering Documentation & Architecture Guides
```

---

## Quick Start (Root Workspace Commands)

You can manage, develop, test, and build the entire workspace directly from the repository root:

### 1. Install All Dependencies

```bash
npm install
```

### 2. Start Development Servers

```bash
# Start Backend API (http://localhost:5000)
npm run dev:server

# Start Web Client (http://localhost:5173)
npm run dev:web

# Start Mobile App (Expo Metro bundler)
npm run dev:mobile
```

### 3. Verification & Testing

```bash
# Run all automated test suites across Server, Web, and Mobile
npm test

# Run code linting & syntax checks
npm run lint

# Run TypeScript typechecks
npm run typecheck

# Build web distribution and verify mobile Hermes bundles
npm run build

# Clean temporary build artifacts
npm run clean
```

---

## Environment Configuration

Copy the example environment files in each application directory:

```bash
# Server configuration
cp server/.env.example server/.env

# Web client configuration
cp client/Leaderboard/.env.example client/Leaderboard/.env

# Mobile configuration
cp mobile/eliteboards-mobile/.env.example mobile/eliteboards-mobile/.env
```

### Backend (`server/.env`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173
ADMIN_EMAIL=admin@example.com
# Optional: Redis connection (Local TCP or Upstash REST)
REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## High-Performance & Concurrency Features

- **Race Condition Immunity**: Atomic MongoDB array operators (`$addToSet`, `$pull`) prevent reaction lost updates; Redis `SETNX` distributed locks prevent duplicate submissions under parallel requests.
- **Single-Flight Cache Stampede Defense**: In-memory query coalescing map collapses hundreds of concurrent cache misses into exactly 1 database execution.
- **Fail-Fast Redis Circuit Breaker**: Automatic active health probe and circuit breaker drops failing Redis connections in < 800ms and gracefully falls back to MongoDB.
- **Decoupled Real-Time Reactions**: Likes and dislikes emit targeted card updates (`entryReactionUpdated`) mutating client UI state in-place with zero rank recalculations or full table refetches.
- **$O(\log N)$ Redis Real-Time Ranking**: Sorted set composite score engine prioritizing CGPA $\to$ Marks $\to$ Timestamp.

---

## CI/CD Pipeline

- **CI Pipeline (`.github/workflows/ci.yml`)**:
  - Server unit, validation, and 20-worker concurrency tests.
  - Web client ESLint validation and production Vite bundling.
  - Mobile TypeScript static analysis, Expo Doctor, and Hermes engine export verification.
  - Unified CI status gate for branch protection.
- **CD Pipeline (`.github/workflows/cd.yml`)**:
  - Automated deployment triggers via Render webhook deploy hook with `/health` polling.
  - Automated production web release bundle packaging.
  - Zero-downtime mobile over-the-air (OTA) updates published to Expo EAS channels (`production` / `preview`).
- **Security Scan (`.github/workflows/security.yml`)**:
  - Automated GitHub CodeQL analysis for JavaScript and TypeScript.

---

## Documentation Index

- [Architecture Overview](docs/architecture.md)
- [CI/CD Pipeline & Deployment Guide](docs/ci-cd.md)
- [Testing & Verification Guide](docs/testing-and-ci.md)
- [Production Readiness Checklist](docs/production-readiness.md)
- [Mobile OTA Updates Guide](docs/mobile-ota.md)
- [Mobile Release Checklist](docs/mobile-release-checklist.md)
- [Feature Report](docs/feature-report.md)
