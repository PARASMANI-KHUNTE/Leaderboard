# Testing & Verification Guide

## Root Commands

You can run full verification suites from the repository root:

```bash
# Run all automated tests across Server, Web, and Mobile
npm test

# Run syntax and lint checks across the entire workspace
npm run lint

# Run TypeScript typechecks across the workspace
npm run typecheck

# Build and export production bundles
npm run build

# Clean temporary build artifacts
npm run clean
```

---

## Workspace Test Matrix

| Subproject | Command | Test Scope |
| :--- | :--- | :--- |
| **Server** | `npm --prefix server test` | - Node syntax checks (`node --check`)<br>- JWT token extraction & precedence<br>- Auth middleware permissions & banned user rejection<br>- Leaderboard edit & submission validation<br>- Report and feedback notification pipelines<br>- Duplicate submission handling (`11000` -> `409 Conflict`)<br>- Atomic reaction toggles & targeted socket notifications<br>- High-concurrency 20-worker mutex stress test<br>- High-concurrency 50-worker atomic reaction set integrity<br>- Redis $O(\log N)$ composite score ranking calculations |
| **Web** | `npm --prefix client/Leaderboard run check` | - ESLint rules compliance<br>- Vite production bundling & code chunking |
| **Mobile** | `npm --prefix mobile/eliteboards-mobile run typecheck && npm --prefix mobile/eliteboards-mobile run doctor` | - TypeScript static typecheck (`tsc --noEmit`)<br>- Expo public configuration validation<br>- Expo Doctor 20-point diagnostic check<br>- Hermes engine bytecode bundle export validation |

---

## Continuous Integration & Deployment

- Automated CI pipeline: [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml)
- Automated CD pipeline: [`.github/workflows/cd.yml`](file:///.github/workflows/cd.yml)
- CodeQL security scan: [`.github/workflows/security.yml`](file:///.github/workflows/security.yml)
- Detailed pipeline architecture guide: [`docs/ci-cd.md`](file:///docs/ci-cd.md)
