const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();
require('./config/passport');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    }
});

app.set('socketio', io);

// Trust proxy to resolve HTTPS correctly behind Render's load balancer
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));
app.use(express.json());

// Session Configuration with connect-mongo
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions', // Optional, default is 'sessions'
        ttl: 14 * 24 * 60 * 60, // 14 days
        autoRemove: 'native' // Default
    }),
    cookie: {
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    }
}));

app.use(passport.initialize());
app.use(passport.session());

const rateLimit = require('express-rate-limit');

// General API Rate Limiter (100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter Auth Rate Limiter (50 requests per 15 minutes)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many authentication attempts, please try again later',
});

// App routes
app.use('/auth', authLimiter, require('./routes/auth'));
app.use('/api/', apiLimiter); // Apply general limiter to all /api routes
app.use('/api/leaderboards', require('./routes/leaderboards'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/feedback', require('./routes/feedback'));

// Health check endpoints
app.get('/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() }));
app.get('/test', (req, res) => res.status(200).json({ message: 'API is working correctly' }));
app.get('/', (req, res) => res.status(200).send('API Server is running'));

// Connect to DB
connectDB();

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinAdmin', () => {
        socket.join('admins');
        console.log('Admin joined secure room');
    });

    socket.on('joinUser', (userId) => {
        socket.join(`user:${userId}`);
        console.log(`User joined personal room: ${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
