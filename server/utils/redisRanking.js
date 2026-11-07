/**
 * Redis Sorted Set (ZSET) Real-Time Ranking Engine for EliteBoards
 * 
 * Provides O(log N) rank computation, top-N retrieval, and score indexing
 * without full collection scans or expensive MongoDB window-function aggregations.
 */

/**
 * Computes a high-precision composite score for a leaderboard entry:
 * - CGPA is the primary factor (scaled by 10^7)
 * - Marks is the secondary tie-breaker (0-700)
 * - Timestamp is the tertiary tie-breaker (earlier timestamp yields higher score)
 */
function computeCompositeScore(cgpa, marks, createdAt) {
    const validCgpa = Number.isFinite(Number(cgpa)) ? Math.max(0, Number(cgpa)) : 0;
    const validMarks = Number.isFinite(Number(marks)) ? Math.max(0, Number(marks)) : 0;
    const timeMs = createdAt ? new Date(createdAt).getTime() : Date.now();

    // Scale timestamp tie-breaker between 0 and 0.999999
    // Modulo 10^11 covers ~3.17 years of rolling unique millisecond resolution
    const timeComponent = (1 - ((timeMs % 100000000000) / 100000000000)) * 0.999999;

    return (validCgpa * 10000000) + validMarks + timeComponent;
}

/**
 * Adds or updates an entry in the leaderboard's Sorted Set
 */
async function syncEntryToZSet(redisClient, leaderboardId, entry) {
    if (!redisClient || typeof redisClient.zAdd !== 'function') return false;
    try {
        const score = computeCompositeScore(entry.cgpa, entry.marks, entry.createdAt);
        const memberId = String(entry._id || entry.id);
        const zsetKey = `lb:${leaderboardId}:zset`;

        await redisClient.zAdd(zsetKey, [{ score, value: memberId }]);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Removes an entry from the leaderboard's Sorted Set
 */
async function removeEntryFromZSet(redisClient, leaderboardId, entryId) {
    if (!redisClient || typeof redisClient.zRem !== 'function') return false;
    try {
        const zsetKey = `lb:${leaderboardId}:zset`;
        await redisClient.zRem(zsetKey, String(entryId));
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Fetches the 1-based rank of a specific entry in O(log N) time
 */
async function getEntryRankFromZSet(redisClient, leaderboardId, entryId) {
    if (!redisClient || typeof redisClient.zRevRank !== 'function') return null;
    try {
        const zsetKey = `lb:${leaderboardId}:zset`;
        const zeroBasedRank = await redisClient.zRevRank(zsetKey, String(entryId));
        return zeroBasedRank !== null && zeroBasedRank !== undefined ? zeroBasedRank + 1 : null;
    } catch (err) {
        return null;
    }
}

/**
 * Retrieves the top N entry IDs in rank order in O(log N + M) time
 */
async function getTopEntryIdsFromZSet(redisClient, leaderboardId, limit = 10) {
    if (!redisClient || typeof redisClient.zRangeWithScores !== 'function') return [];
    try {
        const zsetKey = `lb:${leaderboardId}:zset`;
        const members = await redisClient.zRangeWithScores(zsetKey, 0, Math.max(0, limit - 1), { REV: true });
        return (members || []).map((m, idx) => ({
            id: m.value,
            rank: idx + 1,
            score: m.score,
        }));
    } catch (err) {
        return [];
    }
}

/**
 * Hydrates the Redis Sorted Set from a collection of MongoDB entries
 */
async function hydrateZSet(redisClient, leaderboardId, entries = []) {
    if (!redisClient || typeof redisClient.zAdd !== 'function' || !Array.isArray(entries) || entries.length === 0) {
        return false;
    }
    try {
        const zsetKey = `lb:${leaderboardId}:zset`;
        const members = entries.map((entry) => ({
            score: computeCompositeScore(entry.cgpa, entry.marks, entry.createdAt),
            value: String(entry._id || entry.id),
        }));

        await redisClient.zAdd(zsetKey, members);
        // Expire the ZSET after 1 hour if idle to prevent memory leaks
        if (typeof redisClient.expire === 'function') {
            await redisClient.expire(zsetKey, 3600);
        }
        return true;
    } catch (err) {
        return false;
    }
}

module.exports = {
    computeCompositeScore,
    syncEntryToZSet,
    removeEntryFromZSet,
    getEntryRankFromZSet,
    getTopEntryIdsFromZSet,
    hydrateZSet,
};
