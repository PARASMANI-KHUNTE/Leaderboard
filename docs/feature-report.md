## EliteBoards - Feature Report (Current Implementation)

Date: 2026-03-24

This report summarizes the features currently present in the repository codebase (frontend + backend).

## 1. High-level product features
- Real-time leaderboard updates using `socket.io` (board creation/deletion, entry updates, reaction updates, and live/down status changes).
- Tie-aware ranking visualization (students with identical CGPA + marks share the same rank).
- Google OAuth authentication with Passport, followed by JWT-based API access.
- Admin moderation features: pending reports queue, ban/unban users, feedback management, and resolve report actions.
- Interactive student engagement: like/dislike reactions plus entry reporting.
- “Promoted student” mode UX: special handling when CGPA equals `0` (both UI labeling and celebration behavior).

## 2. Frontend (client) features
- Landing / board explore screen
  - Shows a grid of leaderboards fetched from the backend.
  - Updates the leaderboard list in real time via socket events:
    - `leaderboardCreated`
    - `leaderboardDeleted`
    - `leaderboardStatusUpdated`
  - Logged-in users can create new leaderboards (modal form).
  - Board owners and admins can delete boards; admins can toggle board maintenance (live/down).

- Login
  - “Continue with Google” button that redirects to the backend OAuth route (`/auth/google`).

- Leaderboard details screen (`/lb/:slug`)
  - Loads leaderboard metadata and entries for the selected board.
  - Real-time updates:
    - Entry list updates on `leaderboardUpdate:${leaderboardId}`
    - Live/down status updates on `statusUpdate:${leaderboardId}`
    - Reaction counts updates on `reactionUpdate:${leaderboardId}`
    - Redirect/alert when the board is deleted (`leaderboardDeleted`)
  - Submission / maintenance behavior:
    - Shows an entry form only when `leaderboard.isLive === true`
    - If user is not logged in, shows a login prompt instead of the entry form
    - If maintenance is enabled (down), shows a “Submissions Closed” UI
  - Board-level actions (restricted):
    - Toggle maintenance mode (only admin or creator)
    - Delete entire leaderboard (only admin or creator)
  - Sharing UX:
    - “Share” button copies current URL to clipboard

- Entry submission + editing
  - Validates inputs for name, CGPA (0 to 10), and marks (0 to 700).
  - Supports two scoring modes:
    - Normal mode: display CGPA, with marks used as an optional tie-breaker display
    - “Promoted student mode”: triggered when CGPA is exactly `0`
  - Celebration behavior:
    - Plays `/success.mp3` and shows an overlay celebration when CGPA is `0`
    - Uses Framer Motion for transitions and `canvas-confetti` for celebratory effects

- Ranking visualization (tie logic + UI grouping)
  - Rank calculation shares rank across tie groups where `(cgpa, marks)` are identical.
  - Visual grouping cues for ties (extra background + a vertical indicator).
  - Top ranks display crown/medals, while other ranks display `#rank`.

- Social reactions (engagement)
  - Like (heart) and dislike (thumbs-down) buttons per entry.
  - Requires login to react.
  - UI performs an optimistic update, while socket updates reconcile state.

- Reporting / moderation helpers
  - “Report Fake Entry” flow:
    - Flag button opens a report modal with a reason selector
    - Submits report to backend (`/api/reports/submit`)

- Notifications system
  - A notification bell with unread counter.
  - Notifications persist in `localStorage` per user.
  - Toast + notification bell both respond to backend-emitted `globalNotification` socket events.

- Admin dashboard (`/admin`)
  - Access restricted to `user.isAdmin`.
  - Tabs for:
    - Pending reports
    - Users (with report counts + ban/unban actions)
    - Feedback
  - Admin actions:
    - Resolve report: delete the reported entry or ignore it
    - Ban/unban users
    - Mark feedback read/unread and delete feedback
    - Delete users (purges user activity via backend cascading cleanup)

- Feedback widget
  - Floating “Feedback” button opens a form.
  - Submits feedback to backend (`/api/feedback/submit`).
  - Backend notifies admins in real time via socket.

## 3. Backend (server) features
- Express app + socket.io integration
  - Socket rooms:
    - `admins` for admin-only notifications
    - `user:${userId}` for user-targeted notifications
  - Emits events for:
    - Leaderboard updates: `leaderboardUpdate:${leaderboardId}`
    - Status updates: `statusUpdate:${leaderboardId}` and `leaderboardStatusUpdated`
    - Deletions: `leaderboardDeleted`
    - Reactions: `reactionUpdate:${leaderboardId}`
    - Global admin notifications: `globalNotification`

- Authentication
  - Google OAuth endpoints:
    - `/auth/google`
    - `/auth/google/callback` (issues JWT, redirects with `token=...`)
  - JWT auth middleware (`auth`):
    - Validates token signature using `JWT_SECRET`
    - Loads user from MongoDB
    - Denies access for banned users (`isBanned === true`)
  - Admin middleware (`admin`) checks `req.user.isAdmin`
  - Profile endpoint:
    - `GET /auth/profile` returns user identity + admin/ban flags

- Leaderboards API (`/api/leaderboards`)
  - `POST /create` to create a leaderboard (slug derived from name).
  - `GET /` to list all leaderboards, sorted by `createdAt` (and includes entry count).
  - `GET /:slug` to fetch a leaderboard by slug.
  - `POST /toggle-status/:id` to toggle live/down (only creator or admin).
  - `DELETE /:id` deletes a leaderboard and all its entries (only creator or admin).

- Leaderboard entries API (`/api/leaderboard`)
  - `GET /:leaderboardId` returns entries sorted by CGPA then marks, excluding banned users.
  - `POST /submit` creates an entry (auth required), rejects if user already submitted to that leaderboard.
  - `PUT /edit/:id` edits an entry (auth required, only entry owner).
  - `DELETE /delete/:id` deletes an entry (owner OR leaderboard creator).
  - Reactions:
    - `POST /react/:id` toggles Like (ensures dislike mutual exclusion)
    - `POST /dislike/:id` toggles Dislike (ensures like mutual exclusion)
  - Emits real-time updates for the specific leaderboard after mutations.

- Reporting system
  - `POST /api/reports/submit` creates a pending report from a user about an entry.
  - Admin endpoints (all auth + admin required):
    - `GET /api/admin/reports` lists pending reports
    - `POST /api/admin/resolve-report/:reportId` resolves report:
      - action `delete` deletes the associated entry
      - action `ignore` marks report as ignored
  - Admin can also ban users via the users list in the dashboard.

- Feedback system
  - `POST /api/feedback/submit` stores feedback submitted by authenticated users.
  - Admin endpoints:
    - `GET /api/admin/feedback` lists feedback
    - `PATCH /api/admin/feedback/:id/toggle-read` toggles read status
    - `DELETE /api/admin/feedback/:id` removes feedback

- User deletion + cascading cleanup
  - User can delete account via:
    - `DELETE /auth/delete-account`
  - Admin can delete a user via:
    - `DELETE /api/admin/user/:id`
  - Backend purges related entries, likes/dislikes references, reports, and feedback.

## 4. Notable implementation details
- One-entry-per-user-per-leaderboard rule:
  - Enforced on submission by checking if an entry already exists for `(userId, leaderboardId)`.
- “Promoted mode” rule:
  - On the backend, `useMarks` is set when `cgpa === 0`.
  - The frontend uses this to show “PROMOTED” labeling and alternate display fields.
- Tie ranking:
  - Frontend computes identical-rank groups by matching both `cgpa` and `marks`.

## 5. Claims not verified in current code
- README claims “one-click exports to CSV and high-quality PDF”.
  - In this repository version, there is no obvious CSV/PDF generation code and no common PDF/export dependencies (for example `jspdf`) found in the client dependencies.
  - Treat exports as “planned/claimed” rather than confirmed implemented.

