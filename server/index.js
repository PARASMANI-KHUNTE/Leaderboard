const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const cookieParser = require('cookie-parser');
require('dotenv').config();
require('./config/passport');
const connectDB = require('./config/db');
const { initRedis } = require('./config/redis');
const { RedisStore } = require('rate-limit-redis');
const jwt = require('jsonwebtoken');
const { User } = require('./models/User');
const cookie = require('cookie');

const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);

function getAllowedOrigins() {
    const configured = [
        process.env.CLIENT_URL,
        ...(process.env.CLIENT_URLS || '').split(','),
    ]
        .map((origin) => String(origin || '').trim())
        .filter(Boolean);

    if (process.env.NODE_ENV !== 'production') {
        configured.push(
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:4173',
            'http://127.0.0.1:4173'
        );
    }

    return [...new Set(configured)];
}

const allowedOrigins = getAllowedOrigins();
let runtimeState = {
    startedAt: null,
    redisConnected: false,
};

function isAllowedOrigin(origin) {
    if (!origin) return true;
    return allowedOrigins.includes(origin);
}

async function resolveSocketUser(socket) {
    const cookieHeader = socket.handshake?.headers?.cookie;
    const cookieToken = cookieHeader ? cookie.parse(cookieHeader).token : null;

    const token =
        socket.handshake?.auth?.token ||
        cookieToken ||
        socket.handshake?.headers?.authorization?.replace('Bearer ', '');

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.id) return null;
        const user = await User.findById(decoded.id).select('_id isAdmin isBanned').lean();
        if (!user || user.isBanned) return null;
        return { id: String(user._id), isAdmin: !!user.isAdmin };
    } catch (err) {
        return null;
    }
}

const io = socketIo(server, {
    cors: {
        origin: (origin, cb) => {
            if (isAllowedOrigin(origin)) return cb(null, true);
            cb(new Error('Origin not allowed by Socket.IO CORS'));
        },
        methods: ["GET", "POST"]
    }
});

io.use(async (socket, next) => {
    socket.data.user = await resolveSocketUser(socket);
    next();
});

app.set('socketio', io);

// Trust proxy to resolve HTTPS correctly behind Render's load balancer
app.set('trust proxy', 1);

// Security headers with helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", ...allowedOrigins],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Force HTTPS in production
if (isProduction) {
    app.use((req, res, next) => {
        if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
            return next();
        }
        return res.redirect(`https://${req.hostname}${req.url}`);
    });
}

// CORS configuration
const corsOptions = {
    origin: (origin, cb) => {
        if (isAllowedOrigin(origin)) return cb(null, true);
        cb(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

// Session Configuration with connect-mongo
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60,
        autoRemove: 'native'
    }),
    cookie: {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax'
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
    runtimeState = {
        startedAt: new Date().toISOString(),
        redisConnected: !!redisClient,
    };

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
    app.use('/api/notifications', require('./routes/notifications'));

    // Health check endpoints
    app.get('/health', async (req, res) => {
        const { getRedisStatus } = require('./config/redis');
        const dbReady = mongoose.connection.readyState === 1;
        const redisStatus = getRedisStatus();
        const hasRedisConfigured = redisStatus.enabled;
        const redisReady = !hasRedisConfigured || redisStatus.connected;
        const status = dbReady && redisReady ? 'UP' : 'DEGRADED';

        res.status(status === 'UP' ? 200 : 503).json({
            status,
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.round(process.uptime()),
            startedAt: runtimeState.startedAt,
            services: {
                mongodb: dbReady ? 'UP' : 'DOWN',
                redis: hasRedisConfigured
                    ? (redisStatus.connected ? 'UP' : 'DOWN')
                    : 'DISABLED',
            },
        });
    });
    app.get('/test', (req, res) => res.status(200).json({ message: 'API is working correctly' }));
    app.get('/', (req, res) => res.status(200).send('API Server is running'));

    // Connect to DB before accepting traffic.
    await connectDB();

    io.on('connection', (socket) => {
        console.log('New client connected');

        socket.on('joinAdmin', () => {
            if (!socket.data.user?.id) return;
            if (!socket.data.user?.isAdmin) return;
            socket.join('admins');
            console.log('Admin joined secure room');
        });

        socket.on('joinUser', (userId) => {
            if (!socket.data.user?.id) return;
            if (String(userId) !== String(socket.data.user.id)) return;
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
    server.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
};

start().catch((err) => {
    console.error('[startup] fatal error:', err?.message || err);
    process.exit(1);
});
