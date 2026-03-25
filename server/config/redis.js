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

async function retry(fn, { retries = 3, baseDelayMs = 100, timeoutMs = 5000, label } = {}) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await withTimeout(fn(), timeoutMs, label);
            return result;
        } catch (err) {
            lastErr = err;
            if (attempt === retries) break;
            await sleep(baseDelayMs * (attempt + 1));
        }
    }
    throw lastErr;
}

let cachedClient = null;
let initPromise = null;

async function initRedis() {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Prefer Upstash REST client if credentials exist.
    if (upstashUrl && upstashToken) {
        try {
            const client = new UpstashRedis({
                url: upstashUrl.replace(/^"|"$/g, ''), // tolerate quoted env vars
                token: upstashToken.replace(/^"|"$/g, ''),
            });
            cachedClient = client;
            console.log('[redis] upstash rest client ready');
            return cachedClient;
        } catch (err) {
            console.warn('[redis] upstash unavailable, falling back:', err?.message || err);
            return null;
        }
    }

    // Fallback to local / Redis Cloud (TCP).
    const url = getLocalRedisUrl();
    try {
        const client = createClient({
            url,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: (retries) => {
                    if (retries > 5) return false;
                    return Math.min(retries * 100, 3000);
                },
            },
        });

        client.on('error', (err) => {
            console.warn('[redis] client error:', err?.message || err);
        });

        // Connection itself can hang; guard it.
        await retry(() => client.connect(), { retries: 2, timeoutMs: 5000, label: 'connect' });
        console.log('[redis] connected');
        cachedClient = client;
        return cachedClient;
    } catch (err) {
        console.warn('[redis] unavailable, caching disabled:', err?.message || err);
        return null;
    }
}

async function getRedisClient() {
    if (cachedClient) return cachedClient;
    if (!initPromise) initPromise = initRedis();
    cachedClient = await initPromise;
    return cachedClient;
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
    const v = await cacheGet(redisClient, key);
    // cacheGet expects JSON; for version keys we store raw numbers as strings.
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return Number(v) || 1;
    const raw = await (async () => {
        try {
            return await retry(() => redisClient.get(key), { retries: 2, timeoutMs: 5000, label: `version:${key}` });
        } catch {
            return null;
        }
    })();
    const num = raw !== null ? Number(raw) : NaN;
    return Number.isFinite(num) ? num : 1;
}

async function bumpVersion(redisClient, key) {
    if (!redisClient) return;
    // Version keys should not expire; they act as stable invalidation tokens.
    await retry(() => redisClient.incr(key), { retries: 2, timeoutMs: 5000, label: `bumpVersion:${key}` });
}

module.exports = {
    initRedis,
    getRedisClient,

    cacheGet,
    cacheSet,
    cacheDel,
    cacheSetNX,
    cacheIncr,

    getVersion,
    bumpVersion,
};

