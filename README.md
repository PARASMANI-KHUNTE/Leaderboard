# EliteBoards

EliteBoards is a full-stack realtime leaderboard platform with a React web client, an Expo mobile app, and an Express backend. The repository is now structured to support a cleaner production workflow, automated verification, and project-level documentation.

## Apps

- `server/`: Express API, auth, moderation, realtime events, caching, health checks.
- `client/Leaderboard/`: React + Vite web app.
- `mobile/eliteboards-mobile/`: Expo mobile app with OTA support.

## Quick Start

### 1. Install dependencies

```bash
cd server && npm install
cd ../client/Leaderboard && npm install
cd ../../mobile/eliteboards-mobile && npm install
cd ../..
```

### 2. Configure environment variables

Backend example:

```env
PORT=5000
MONGODB_URI=your_mongodb_uri
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173
ADMIN_EMAIL=your_admin_email
```

Web example:

```env
VITE_API_URL=http://localhost:5000
```

Mobile example:

```env
EXPO_PUBLIC_API_URL=http://your-local-ip:5000
```

### 3. Run the apps

Backend:

```bash
cd server
npm run dev
```

Web:

```bash
cd client/Leaderboard
npm run dev
```

Mobile:

```bash
cd mobile/eliteboards-mobile
npx expo start
```

## One Command Verification

Run all major repo checks from the root:

```bash
npm test
```

That command runs:

- backend syntax checks and backend tests
- web lint and production build
- mobile typecheck, Expo config validation, and Expo doctor

## Current Repo Status

- Backend startup fails fast when MongoDB is unavailable.
- `/health` reflects dependency state instead of always returning success.
- Web lint and build pass.
- Mobile typecheck and Expo doctor pass.
- Backend tests cover auth, validation, and report/feedback submission behavior.
- Web routes are lazily loaded to reduce the initial bundle.

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Production Readiness](docs/production-readiness.md)
- [Testing and CI](docs/testing-and-ci.md)
- [Mobile OTA Updates](docs/mobile-ota.md)
- [Mobile Release Checklist](docs/mobile-release-checklist.md)
- [Legacy Feature Report](doc/ELiteBoards_Feature_Report.md)

## Notes

- OTA updates can change JavaScript and Expo-managed assets, but not native code or the native splash screen.
- Production Android EAS builds now target an AAB artifact.
- The repo still benefits from future expansion into browser/mobile E2E coverage and production observability.
