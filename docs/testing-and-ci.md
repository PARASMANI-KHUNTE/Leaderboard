# Testing and CI

## Root Command

Run all major verification steps from the repository root:

```bash
npm test
```

This fans out to:

- `server`: syntax checks plus backend tests
- `client/Leaderboard`: lint plus production build
- `mobile/eliteboards-mobile`: typecheck, Expo config validation, and Expo doctor

## Server Coverage

The backend test suite currently covers:

- token extraction precedence
- auth middleware success and rejection paths
- banned-user rejection
- leaderboard edit payload validation
- report submission validation and notification emission
- feedback submission validation and notification emission

## CI

GitHub Actions runs the same verification paths in `.github/workflows/ci.yml`.

## What Is Not Covered Yet

- full browser E2E tests
- database-backed route integration tests
- mobile UI tests
- visual regression tests

## Recommended Testing Expansion

1. Add Playwright for web login and leaderboard submission flows.
2. Add API integration tests against a disposable MongoDB instance.
3. Add release smoke tests for OTA preview updates.
