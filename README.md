# EliteBoards - Premium Leaderboard System

EliteBoards is a high-performance, real-time leaderboard platform designed for students and educational cohorts. It features premium glassmorphic UI, real-time socket updates, and robust handling of student rankings including tie-ranking logic.

## 🚀 Key Features

- **Premium UI**: Modern dark-mode design with glassmorphism, glowing accents, and smooth Framer Motion animations.
- **Real-time Synchronization**: Powered by Socket.io, providing instant updates for submissions, reactions, and leaderboard status.
- **Smart Ranking**: Correctly handles ties. Students with identical CGPA and Marks share the same rank and are visually grouped together.
- **Leaderboard Management**:
  - Creators and Admins can delete boards and entries.
  - Admins can toggle "Maintenance Mode" to pause submissions globally.
- **Celebration UX**: Interactive confetti and success animations for "Promoted" student submissions.
- **Exports**: One-click exports to CSV and high-quality PDF.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: Node.js, Express, MongoDB, Mongoose, Socket.io.
- **Authentication**: Google OAuth 2.0 via Passport.js, JWT for secure API access.

## 📋 Prerequisites

- Node.js (v16+)
- MongoDB (Local or Atlas)
- Google Cloud Console Project (for OAuth)

## 🏗️ Getting Started

### 1. Clone & Install
```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd client/Leaderboard
npm install
```

### 2. Environment Setup
Create a `.env` file in both `server/` and `client/Leaderboard/` directories based on the provided `.env.example` files.

**Server `.env`**:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=your_admin_email
```

**Client `.env`**:
```env
VITE_API_URL=http://localhost:5000
```

### 3. Run the Project
```bash
# Run Server (from /server)
npm run dev

# Run Client (from /client/Leaderboard)
npm run dev
```

## 🔒 Security

All mission-critical variables are managed via environment variables. Hardcoded secrets are strictly avoided. Refer to the `security_audit_report.md` for more details.

---
Created with ❤️ for students.
