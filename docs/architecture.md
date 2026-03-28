# Architecture Overview

## Monorepo Layout

- `server/`: Express API, auth, moderation routes, Redis-backed caching, Socket.IO realtime layer.
- `client/Leaderboard/`: React + Vite web app for public leaderboard browsing and admin moderation.
- `mobile/eliteboards-mobile/`: Expo Router mobile app with OTA update support and realtime notifications.
- `docs/`: Operational and engineering documentation.

## Backend

The backend is a Node.js + Express service with:

- Google OAuth and JWT-based API auth.
- Cookie-based web auth support.
- Socket.IO for leaderboard updates, admin notifications, and personal notification rooms.
- MongoDB for persistence.
- Redis or Upstash Redis for caching and rate-limit storage when configured.

Key runtime characteristics:

- Startup now fails fast when MongoDB is unavailable.
- `/health` reports dependency state instead of always returning a false-positive success.
- Admin and user notification rooms are gated by authenticated socket identity.

## Web App

The web app uses:

- React 19
- Vite
- Tailwind CSS
- Framer Motion
- Axios
- Socket.IO client

It now uses route-level lazy loading to reduce the initial production bundle and keeps auth via cookies.

## Mobile App

The mobile app uses:

- Expo SDK 55
- Expo Router
- SecureStore for token persistence
- Expo Updates for OTA delivery
- Socket.IO client for realtime sync

Release readiness notes:

- `expo-doctor` passes.
- OTA is configured through EAS channels.
- Native splash changes still require a new native build, not OTA.

## Verification Surface

Current automated checks cover:

- Server syntax checks and backend unit/integration-style tests.
- Web lint and production build.
- Mobile type checking, Expo public config generation, and Expo doctor.
