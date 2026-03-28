# Production Readiness

## Current Status

The project is deployable and materially hardened, but "production-grade" still depends on your operational discipline after deployment.

## What Is In Good Shape

- Backend startup fails on missing MongoDB instead of running in a broken state.
- Health checks expose dependency state.
- Socket auth and origin checks are hardened.
- Web lint and build pass.
- Mobile type checks and Expo doctor pass.
- CI exists for server, web, and mobile verification.
- A single root `npm test` command now runs all major checks.

## Remaining Gaps

These are not blockers for a controlled launch, but they are still real production risks:

- No end-to-end browser tests.
- No release smoke tests against a deployed backend.
- No mobile UI automation.
- No centralized error tracking configured in-repo.
- No documented rollback procedure for backend deploys and OTA updates.

## Recommended Launch Checklist

1. Verify production environment variables on the deployed backend.
2. Run root `npm test` before every release.
3. Perform one manual web auth flow and one mobile auth flow against the deployed environment.
4. Publish OTA first to a preview/internal audience before production.
5. Confirm `/health` returns `UP` after deployment.

## Recommended Next Steps

- Add browser E2E coverage for login, leaderboard browsing, entry submission, and admin moderation.
- Add mobile release smoke test steps for Android and iOS builds.
- Integrate error tracking and uptime alerting.
