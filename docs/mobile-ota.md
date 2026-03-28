# Mobile OTA Updates

## Current Setup

The Expo mobile app uses:

- `expo-updates`
- EAS channels
- `runtimeVersion.policy = appVersion`

Production and preview channels are configured in `mobile/eliteboards-mobile/eas.json`.

## Important Rules

- OTA can update JavaScript and assets bundled through Expo Updates.
- OTA cannot change native Android or iOS code.
- OTA cannot change the native splash screen; that still requires a new build.
- Any native dependency or config change requires a new binary release.

## Release Flow

1. Build and install a native binary for the target channel.
2. Publish updates to `preview` first.
3. Validate auth, sockets, leaderboard fetches, and notifications on the installed build.
4. Promote the same code to `production` once verified.

## Current Readiness

- `expo-doctor` passes.
- app config is valid.
- EAS update URL is configured.
- production Android build now targets an AAB artifact for store-style release.

## Operational Recommendation

Keep a short OTA release checklist with:

- app version/runtime compatibility check
- API base URL check
- one login flow test
- one leaderboard fetch test
- one realtime notification test

For a concrete release checklist, use [Mobile Release Checklist](mobile-release-checklist.md).
