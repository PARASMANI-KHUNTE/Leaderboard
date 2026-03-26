# EliteBoards - Premium Leaderboard System

EliteBoards is a high-performance, real-time leaderboard platform designed for students and educational cohorts. It features a premium glassmorphic UI, real-time socket updates, and robust handling of student rankings including tie-breaking logic.

---

## 🎨 Preview

### 🏠 Landing Page
![Landing Page](landing.page.jpg)

### 📊 Leaderboard View
![Leaderboard](leaderboadpage.jpg)

### 📌 Footer Section
![Footer](footer.jpg)

---

## ✨ Key Features

### 🌐 Core Experience
- **Premium UI/UX**: Modern dark-mode design with glassmorphism, glowing accents, and smooth Framer Motion animations.
- **Real-time Sync**: Powered by Socket.io, providing instant updates for submissions, reactions, and leaderboard status across Web and Mobile.
- **Smart Ranking**: Advanced ranking logic that correctly handles ties. Students with identical CGPA and Marks share the same rank and are visually grouped.
- **Celebration UX**: Interactive confetti and success animations for "Promoted" student submissions.

### 🛠️ Platform Specifics
- **Web Frontend**: Built with React and Vite for blazing-fast performance and SEO optimization.
- **Mobile App**: Built with Expo (React Native), featuring native performance, smooth transitions, and **Push Notifications**.
- **Admin Dashboard**: Centralized moderation tools for managing reports, banning/unbanning users, and toggling "Maintenance Mode".

### 📊 Data & Social
- **Exports**: One-click exports to CSV and high-quality PDF for record-keeping.
- **Engagement**: Real-time heart and thumbs-down reactions for student entries.
- **Security**: Robust Google OAuth 2.0 integration and JWT-based API protection.

---

## 🛠️ Tech Stack

### Frontend (Web)
- **Framework**: React 18, Vite
- **Styling**: Tailwind CSS, Vanilla CSS
- **Animations**: Framer Motion, Canvas Confetti
- **State/Data**: Axios, Socket.io-client

### Mobile (Cross-Platform)
- **Framework**: Expo, React Native
- **Navigation**: Expo Router
- **Animations**: Reanimated, Lottie
- **Notifications**: Expo Notifications

### Backend (Server)
- **Runtime**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Auth**: Passport.js (Google OAuth 2.0), JWT
- **Real-time**: Socket.io

---

## 🏗️ Getting Started

### 📋 Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Google Cloud Console Project (for OAuth)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/PARASMANI-KHUNTE/Leaderboard.git
cd Leaderboard

# Install Server Dependencies
cd server
npm install

# Install Web Dependencies
cd ../client/Leaderboard
npm install

# Install Mobile Dependencies
cd ../../mobile/eliteboards-mobile
npm install
```

### 2. Environment Setup
Create a `.env` file in each component's root directory.

#### **Backend (`/server/.env`)**
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=your_admin_email
```

#### **Web (`/client/Leaderboard/.env`)**
```env
VITE_API_URL=http://localhost:5000
```

#### **Mobile (`/mobile/eliteboards-mobile/.env`)**
```env
EXPO_PUBLIC_API_URL=http://your-local-ip:5000
```

### 3. Running the Project

#### **Start Backend**
```bash
cd server
npm run dev
```

#### **Start Web**
```bash
cd client/Leaderboard
npm run dev
```

#### **Start Mobile**
```bash
cd mobile/eliteboards-mobile
npx expo start
```

---

## 🔒 Security & Performance
All mission-critical variables are managed via environment variables. The system includes a cascading cleanup mechanism for user deletions and is audited for security. Refer to the `doc/ELiteBoards_Feature_Report.md` for a full breakdown of implemented features.

---

## 👨‍💻 Author

**Parasmani Khunte**
- [Portfolio](https://parasmanikhunte.onrender.com/)
- [GitHub](https://github.com/PARASMANI-KHUNTE)

Created with ❤️ for students.
