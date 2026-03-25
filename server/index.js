const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
require('dotenv').config();
require('./config/passport');
const connectDB = require('./config/db');
const { initRedis } = require('./config/redis');
const { RedisStore } = require('rate-limit-redis');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
// Allow requests from both the web client and mobile devices on the LAN.
const allowedOrigins = [process.env.CLIENT_URL];

const io = socketIo(server, {
    cors: {
        origin: (origin, cb) => {
            // Mobile apps (React Native) send no origin header; allow them.
            if (!origin) return cb(null, true);
            if (allowedOrigins.includes(origin)) return cb(null, true);
            cb(null, true); // In dev, allow all origins for mobile testing.
        },
        methods: ["GET", "POST"]
    }
});

app.set('socketio', io);

// Trust proxy to resolve HTTPS correctly behind Render's load balancer
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: (origin, cb) => {
        // React Native requests have no origin header; allow them.
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(null, true); // In dev, allow all origins for mobile testing.
    },
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

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const createHybridKey = (req) => {
    // Prefer userId when JWT is present, else fall back to IP+User-Agent.
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded?.id) return `user:${decoded.id}`;
        }
    } catch (e) {
        // ignore invalid token and fall back
    }
    // Normalize IPv6/IPv4 addressing so rate-limit can't be bypassed.
    const ip = ipKeyGenerator(req.ip || 'unknown_ip');
    const ua = req.headers?.['user-agent'] || 'unknown_ua';
    return `ip:${ip}:ua:${ua}`;
};

const start = async () => {
    const redisClient = await initRedis();

    const rateLimitPrefix = process.env.RATE_LIMIT_PREFIX || 'rl:';

    // Redis-backed store for express-rate-limit (optional).
    // Create a unique store per limiter (express-rate-limit validation requires this).
    const canUseRateLimitRedisStore = redisClient && typeof redisClient.sendCommand === 'function';

    const apiRedisStore = canUseRateLimitRedisStore
        ? new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
            prefix: `${rateLimitPrefix}rate:api:`,
        })
        : undefined;

    const authRedisStore = canUseRateLimitRedisStore
        ? new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
            prefix: `${rateLimitPrefix}rate:auth:`,
        })
        : undefined;

    // General API Rate Limiter (100 requests per 15 minutes per key)
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests, please try again after 15 minutes',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: createHybridKey,
        store: apiRedisStore,
    });

    // Stricter Auth Rate Limiter (50 requests per 15 minutes per key)
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 50,
        message: 'Too many authentication attempts, please try again later',
        keyGenerator: createHybridKey,
        store: authRedisStore,
    });

    // App routes
    app.use('/auth', authLimiter, require('./routes/auth'));
    // Compatibility alias so mobile can call `POST /api/auth/exchange`.
    app.use('/api/auth', authLimiter, require('./routes/auth'));
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
    await connectDB();

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

        socket.on('joinLeaderboard', (leaderboardId) => {
            if (!leaderboardId) return;
            socket.join(`leaderboard:${leaderboardId}`);
            console.log(`Client joined leaderboard room: ${leaderboardId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start();
