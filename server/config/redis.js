const { createClient } = require('redis');
const { Redis: UpstashRedis } = require('@upstash/redis');

function getLocalRedisUrl() {
    return process.env.REDIS_URL || 'redis://localhost:6379';
}

function getCacheTtlSeconds() {
    const raw = process.env.REDIS_CACHE_TTL_SECONDS;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : 60;
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function withTimeout(promise, ms, label) {
    if (!ms || ms <= 0) return promise;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`[redis] timeout${label ? `:${label}` : ''} after ${ms}ms`)), ms);
        }),
    ]);
}

let consecutiveFailures = 0;
let circuitBreakerOpenUntil = 0;

function isCircuitOpen() {
    return Date.now() < circuitBreakerOpenUntil;
}

function recordSuccess() {
    consecutiveFailures = 0;
}

function recordFailure(label) {
    consecutiveFailures++;
    if (consecutiveFailures >= 3 && !isCircuitOpen()) {
        circuitBreakerOpenUntil = Date.now() + 30000;
        console.warn(`[redis] Circuit breaker open for 30s after 3 consecutive failures (last: ${label || 'operation'})`);
    }
}

async function retry(fn, { retries = 0, baseDelayMs = 50, timeoutMs = 800, label } = {}) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await withTimeout(fn(), timeoutMs, label);
            recordSuccess();
            return result;
        } catch (err) {
            lastErr = err;
            if (attempt === retries) break;
            await sleep(baseDelayMs * (attempt + 1));
        }
    }
    recordFailure(label);
    throw lastErr;
}

let cachedClient = null;
let initPromise = null;
let redisStatus = {
    enabled: false,
    connected: false,
    mode: null,
};

async function initRedis() {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    redisStatus.enabled = !!(upstashUrl && upstashToken) || !!process.env.REDIS_URL;

    // Prefer Upstash REST client if credentials exist.
    if (upstashUrl && upstashToken) {
        try {
            const client = new UpstashRedis({
                url: upstashUrl.replace(/^"|"$/g, ''), // tolerate quoted env vars
                token: upstashToken.replace(/^"|"$/g, ''),
            });
            // Actively probe with a strict 1000ms timeout
            await withTimeout(client.ping(), 1000, 'upstash-probe');
            cachedClient = client;
            redisStatus.connected = true;
            redisStatus.mode = 'upstash-rest';
            console.log('[redis] upstash rest client ready and verified');
            return cachedClient;
        } catch (err) {
            redisStatus.connected = false;
            redisStatus.mode = 'upstash-rest';
            console.warn('[redis] upstash endpoint unreachable (falling back to database):', err?.message || err);
            cachedClient = null;
        }
    }

    // Fallback to local / Redis Cloud (TCP).
    // If no Redis URL is explicitly provided or in test environment, skip connect attempt
    if (!process.env.REDIS_URL || process.env.NODE_ENV === 'test') {
        redisStatus.connected = false;
        redisStatus.mode = null;
        return null;
    }

    const url = getLocalRedisUrl();
    let client = null;
    try {
        client = createClient({
            url,
            socket: {
                connectTimeout: 1500,
                reconnectStrategy: (retries) => {
                    if (retries > 2) return false;
                    return Math.min(retries * 100, 1000);
                },
            },
        });

        client.on('error', (err) => {
            console.warn('[redis] client error:', err?.message || err);
        });

        // Connection itself can hang; guard it.
        await retry(() => client.connect(), { retries: 1, timeoutMs: 1500, label: 'connect' });
        console.log('[redis] connected via TCP');
        cachedClient = client;
        redisStatus.connected = true;
        redisStatus.mode = 'tcp';
        return cachedClient;
    } catch (err) {
        if (client) {
            try { await client.disconnect(); } catch (_) {}
        }
        redisStatus.connected = false;
        redisStatus.mode = 'tcp';
        console.warn('[redis] unavailable, caching disabled:', err?.message || err);
        return null;
    }
}

async function getRedisClient() {
    if (isCircuitOpen()) return null;
    if (cachedClient) return cachedClient;
    if (!initPromise) initPromise = initRedis();
    cachedClient = await initPromise;
    return cachedClient;
}

function getRedisStatus() {
    return { ...redisStatus };
}

function isUpstashClient(client) {
    // Upstash REST client doesn't have sendCommand (TCP Redis protocol).
    return !!client && typeof client.sendCommand !== 'function';
}

function serialize(value) {
    return JSON.stringify(value);
}

function isNil(v) {
    return v === null || v === undefined;
}

async function cacheGet(redisClient, key) {
    if (!redisClient) return null;
    try {
        const raw = await retry(() => redisClient.get(key), { retries: 2, timeoutMs: 5000, label: `get:${key}` });
        if (raw === null || raw === undefined) return null;
        if (typeof raw !== 'string') return raw;
        try {
            return JSON.parse(raw);
        } catch (err) {
            console.warn('[redis] cacheGet JSON parse error:', err?.message || err);
            return null;
        }
    } catch (err) {
        return null;
    }
}

async function cacheSet(redisClient, key, value, ttlSeconds = getCacheTtlSeconds()) {
    if (!redisClient) return;
    const ttl = Number.isFinite(Number(ttlSeconds)) ? Number(ttlSeconds) : getCacheTtlSeconds();
    const payload = serialize(value);

    const isUpstash = isUpstashClient(redisClient);
    const setFn = async () => {
        if (isUpstash) {
            // Upstash supports SETEX-like behavior via `setex`.
            if (typeof redisClient.setex === 'function') {
                return redisClient.setex(key, ttl, payload);
            }
            // Fallback to plain set with ex option (if supported).
            return redisClient.set(key, payload, { ex: ttl });
        }

        // TCP Redis
        return redisClient.set(key, payload, { EX: ttl });
    };

    try {
        await retry(setFn, { retries: 2, timeoutMs: 5000, label: `set:${key}` });
    } catch (err) {
        // ignore cache errors (never block the API)
    }
}

async function cacheDel(redisClient, key) {
    if (!redisClient) return;
    try {
        await retry(() => redisClient.del(key), { retries: 2, timeoutMs: 5000, label: `del:${key}` });
    } catch (err) {
        // ignore cache errors
    }
}

async function cacheIncr(redisClient, key, ttl = 60) {
    if (!redisClient) return 0;
    const ttlSeconds = Number.isFinite(Number(ttl)) ? Number(ttl) : 60;

    const isUpstash = isUpstashClient(redisClient);
    try {
        const val = await retry(() => redisClient.incr(key), { retries: 2, timeoutMs: 5000, label: `incr:${key}` });
        const num = Number(val);
        if (num === 1) {
            // Ensure expiry so counters don't live forever.
            await retry(() => redisClient.expire(key, ttlSeconds), { retries: 2, timeoutMs: 5000, label: `expire:${key}` });
        }
        return num;
    } catch (err) {
        return 0;
    }
}

async function cacheSetNX(redisClient, key, value, ttl = 60) {
    if (!redisClient) return false;
    const payload = serialize(value);
    const ttlSeconds = Number.isFinite(Number(ttl)) ? Number(ttl) : 60;

    try {
        const isUpstash = isUpstashClient(redisClient);

        if (isUpstash && typeof redisClient.setnx === 'function') {
            const res = await retry(() => redisClient.setnx(key, payload), { retries: 2, timeoutMs: 5000, label: `setnx:${key}` });
            if (res === 1) {
                await retry(() => redisClient.expire(key, ttlSeconds), { retries: 2, timeoutMs: 5000, label: `expire:${key}` });
                return true;
            }
            return false;
        }

        // TCP Redis: SET key value NX EX ttl
        const res = await retry(
            () => redisClient.set(key, payload, { NX: true, EX: ttlSeconds }),
            { retries: 2, timeoutMs: 5000, label: `setnx:${key}` }
        );
        return res === 'OK';
    } catch (err) {
        return false;
    }
}

async function getVersion(redisClient, key) {
    if (!redisClient) return 1;
    try {
        const v = await cacheGet(redisClient, key);
        if (typeof v === 'number') return v;
        if (typeof v === 'string') return Number(v) || 1;
        return 1;
    } catch {
        return 1;
    }
}

async function bumpVersion(redisClient, key) {
    if (!redisClient) return 1;
    try {
        // Version keys act as stable invalidation tokens.
        const next = await retry(() => redisClient.incr(key), { retries: 0, timeoutMs: 800, label: `bumpVersion:${key}` });
        return next || 1;
    } catch {
        return 1;
    }
}

module.exports = {
    initRedis,
    getRedisClient,
    getRedisStatus,

    cacheGet,
    cacheSet,
    cacheDel,
    cacheSetNX,
    cacheIncr,

    getVersion,
    bumpVersion,
};
