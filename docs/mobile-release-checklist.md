# Mobile Release Checklist

## Before Building

1. Confirm `EXPO_PUBLIC_API_URL` points to the intended backend.
2. Confirm `runtimeVersion.policy` is still compatible with the binary you plan to ship.
3. If native code, plugins, or native config changed, bump app version and create a new binary.
4. Run root verification:

```bash
npm test
```

## Before Publishing OTA

1. Publish to the `preview` channel first.
2. Install a matching preview build on a physical device.
3. Verify:
   - login flow
   - leaderboard list fetch
   - leaderboard detail fetch
   - submit/edit/delete entry
   - realtime notifications
   - admin-only routes if applicable

## Before Production Release

1. Confirm the production EAS profile is using the correct channel.
2. Confirm Android production builds target `app-bundle`.
3. Confirm `/health` on the backend reports `UP`.
4. Validate one fresh install and one update path on a real device.

## Important Reminders

- OTA does not change native splash behavior.
- OTA does not update native libraries or native permissions.
- Any native change requires a new binary release.
- If compatibility changes, ship a new binary before relying on OTA.

## Recommended Rollout Flow

1. Build preview binary.
2. Publish preview OTA.
3. Validate on device.
4. Build production binary if needed.
5. Publish production OTA.
6. Re-validate login, fetch, and notifications on production install.
