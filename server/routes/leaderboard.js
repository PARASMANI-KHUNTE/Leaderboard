const express = require('express');
const router = express.Router();
const LeaderboardEntry = require('../models/Leaderboard');
const Leaderboard = require('../models/LeaderboardCollection');
const { User } = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { auth } = require('../middleware/auth');
const {
    validateLeaderboardEntry,
    validateLeaderboardEntryEdit,
    validateObjectId,
} = require('../middleware/validation');
const { sendPushNotification } = require('../utils/push');
const {
    getRedisClient,
    cacheGet,
    cacheSet,
    cacheDel,
    cacheSetNX,
    getVersion,
    bumpVersion,
} = require('../config/redis');
const {
    syncEntryToZSet,
    removeEntryFromZSet,
    hydrateZSet,
} = require('../utils/redisRanking');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Single-flight in-memory promise map to eliminate cache stampedes / thundering herds
const inflightQueries = new Map();

function hasUserReaction(reactions = [], userId) {
    return reactions.some((id) => String(id) === String(userId));
}

function removeUserReaction(reactions = [], userId) {
    return reactions.filter((id) => String(id) !== String(userId));
}

function encodeCursor(cursorObj) {
    return Buffer.from(JSON.stringify(cursorObj)).toString('base64url');
}

function decodeCursor(cursorStr) {
    if (!cursorStr) return null;
    try {
        const json = Buffer.from(cursorStr, 'base64url').toString('utf8');
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

async function getBanVersion(redisClient) {
    return await getVersion(redisClient, 'lb:ban:version');
}

async function getEntriesVersion(redisClient, leaderboardId) {
    return await getVersion(redisClient, `lb:${leaderboardId}:version`);
}

async function invalidateEntriesCache(redisClient, leaderboardId) {
    // We use versioned cache keys, so invalidation is a cheap INCR.
    await bumpVersion(redisClient, `lb:${leaderboardId}:version`);
}

// Cached banned user IDs resolver to eliminate full collection scans on every request
async function getBannedUserIds(redisClient) {
    if (redisClient) {
        try {
            const banVersion = await getBanVersion(redisClient);
            const cacheKey = `lb:banned_ids:v:${banVersion}`;
            const cached = await cacheGet(redisClient, cacheKey);
            if (Array.isArray(cached)) {
                return cached.map((id) => new mongoose.Types.ObjectId(id));
            }
        } catch {
            // fallback to database query
        }
    }

    const bannedUsers = await User.find({ isBanned: true }).select('_id').lean();
    const bannedIds = bannedUsers.map((u) => u._id);

    if (redisClient) {
        try {
            const banVersion = await getBanVersion(redisClient);
            const cacheKey = `lb:banned_ids:v:${banVersion}`;
            await cacheSet(redisClient, cacheKey, bannedIds.map(String), 300);
        } catch {}
    }
    return bannedIds;
}

// Get entries for a specific leaderboard (cursor-based + stable ordering + stampede-protected)
router.get('/:leaderboardId', async (req, res) => {
    try {
        const { leaderboardId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(leaderboardId)) {
            return res.status(400).json({ message: 'Invalid leaderboard ID format' });
        }

        const rawLimit = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
        const limit = Number.isFinite(rawLimit)
            ? Math.min(Math.max(Math.floor(rawLimit), 1), MAX_LIMIT)
            : DEFAULT_LIMIT;
        const cursor = decodeCursor(req.query.cursor);

        const pageValue = cursor?.page ? Number(cursor.page) : 1;
        const page = Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
        const cursorCgpa = cursor?.cgpa;
        const cursorMarks = cursor?.marks;
        const cursorId = cursor?.id && mongoose.Types.ObjectId.isValid(cursor.id)
            ? new mongoose.Types.ObjectId(cursor.id)
            : null;

        const redisClient = await (async () => {
            try {
                return await getRedisClient();
            } catch {
                return null;
            }
        })();

        // Cache only hot data to avoid cache explosion:
        // - leaderboard top 10: first page only
        // - entries pages: limit=20 only, page 1 and 2 only
        const cursorProvided = !!req.query.cursor;
        const canCache = redisClient && (
            (limit === 10 && !cursorProvided && page === 1) ||
            (limit === DEFAULT_LIMIT && page <= 2)
        );

        let cacheKey = null;
        if (canCache) {
            try {
                const [banVersion, entriesVersion] = await Promise.all([
                    getBanVersion(redisClient),
                    getEntriesVersion(redisClient, leaderboardId),
                ]);
                cacheKey = `lb:${leaderboardId}:entries:page:${page}:limit:${limit}:banV:${banVersion}:v:${entriesVersion}`;
                const cached = await cacheGet(redisClient, cacheKey);
                if (cached) {
                    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');
                    return res.json(cached);
                }
            } catch {
                cacheKey = null;
            }
        }

        // Single-flight executor to coalesce concurrent cache misses into one database query
        const executeFetch = async () => {
            const bannedUserIds = await getBannedUserIds(redisClient);

            const matchBase = {
                leaderboardId: new mongoose.Types.ObjectId(leaderboardId),
                userId: { $nin: bannedUserIds },
            };

            const pipeline = [
                { $match: matchBase },
                {
                    $addFields: {
                        tieScore: {
                            $add: [
                                { $multiply: ['$cgpa', 1000000] },
                                { $ifNull: ['$marks', 0] },
                            ],
                        },
                    },
                },
                {
                    $setWindowFields: {
                        sortBy: { tieScore: -1 },
                        output: {
                            rank: { $rank: {} },
                        },
                    },
                },
            ];

            // Cursor pagination (stable): order is cgpa desc, marks desc, _id desc.
            if (
                cursorId &&
                Number.isFinite(Number(cursorCgpa)) &&
                (cursorMarks === null || Number.isFinite(Number(cursorMarks)))
            ) {
                pipeline.push({
                    $match: {
                        $or: [
                            { cgpa: { $lt: cursorCgpa } },
                            {
                                cgpa: cursorCgpa,
                                marks: { $lt: cursorMarks },
                            },
                            {
                                cgpa: cursorCgpa,
                                marks: cursorMarks,
                                _id: { $lt: cursorId },
                            },
                        ],
                    },
                });
            }

            pipeline.push(
                { $sort: { cgpa: -1, marks: -1, _id: -1 } },
                { $limit: limit + 1 },
                {
                    $project: {
                        _id: 1,
                        leaderboardId: 1,
                        userId: 1,
                        name: 1,
                        cgpa: 1,
                        marks: 1,
                        useMarks: 1,
                        userPicture: 1,
                        likedBy: 1,
                        dislikedBy: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        rank: 1,
                    },
                }
            );

            const result = await LeaderboardEntry.aggregate(pipeline);

            const hasMore = result.length > limit;
            const items = hasMore ? result.slice(0, limit) : result;

            let nextCursor = null;
            if (hasMore) {
                const last = items[items.length - 1];
                nextCursor = encodeCursor({
                    cgpa: last.cgpa,
                    marks: last.marks,
                    id: last._id.toString(),
                    page: page + 1,
                });
            }

            const response = {
                items,
                hasMore,
                nextCursor,
                page,
            };

            if (canCache && cacheKey) {
                await cacheSet(
                    redisClient,
                    cacheKey,
                    response,
                    Number(process.env.REDIS_CACHE_TTL_SECONDS) || 45
                );
            }

            // Hydrate Redis ZSET in background for fast rank indexing
            if (redisClient && items.length > 0) {
                hydrateZSet(redisClient, leaderboardId, items).catch(() => {});
            }

            return response;
        };

        res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');

        if (canCache && cacheKey) {
            if (inflightQueries.has(cacheKey)) {
                const coalescedResponse = await inflightQueries.get(cacheKey);
                return res.json(coalescedResponse);
            }

            const fetchPromise = executeFetch().finally(() => {
                inflightQueries.delete(cacheKey);
            });
            inflightQueries.set(cacheKey, fetchPromise);

            const response = await fetchPromise;
            return res.json(response);
        }

        const response = await executeFetch();
        return res.json(response);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Submit entry (race-condition free with idempotency mutex + unique index constraint + atomic count)
router.post('/submit', auth, validateLeaderboardEntry, async (req, res) => {
    const { name, cgpa, marks, leaderboardId } = req.body;
    let lockKey = null;
    let redisClient = null;

    try {
        const user = await User.findById(req.user.id).select('_id profilePicture isBanned');
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isBanned) return res.status(403).json({ message: 'Your account has been banned' });

        const leaderboard = await Leaderboard.findById(leaderboardId);
        if (!leaderboard) return res.status(404).json({ message: 'Leaderboard not found' });
        if (!leaderboard.isLive) return res.status(403).json({ message: 'This leaderboard is currently closed for submissions' });

        // Acquire 5-second distributed idempotency lock to prevent double-submits
        redisClient = await getRedisClient().catch(() => null);
        if (redisClient) {
            lockKey = `lock:submit:${leaderboardId}:${user._id}`;
            const acquired = await cacheSetNX(redisClient, lockKey, '1', 5);
            if (!acquired) {
                return res.status(429).json({ message: 'Submission already processing, please wait' });
            }
        }

        const existingEntry = await LeaderboardEntry.findOne({ userId: user._id, leaderboardId }).select('_id');
        if (existingEntry) {
            if (lockKey && redisClient) await cacheDel(redisClient, lockKey);
            return res.status(400).json({ message: 'You have already made an entry in this leaderboard' });
        }

        const useMarks = parseFloat(cgpa) === 0;
        const entry = new LeaderboardEntry({
            leaderboardId,
            userId: user._id,
            name: String(name).trim().slice(0, 100),
            cgpa: parseFloat(cgpa),
            marks: (marks !== null && marks !== undefined) ? parseFloat(marks) : null,
            useMarks,
            userPicture: user.profilePicture
        });

        try {
            await entry.save();
        } catch (saveErr) {
            if (saveErr.code === 11000) {
                if (lockKey && redisClient) await cacheDel(redisClient, lockKey);
                return res.status(409).json({ message: 'You have already made an entry in this leaderboard' });
            }
            throw saveErr;
        }

        // Increment entryCount atomically on the leaderboard collection
        await Leaderboard.findByIdAndUpdate(leaderboardId, { $inc: { entryCount: 1 } }).catch(() => {});

        if (redisClient) {
            await syncEntryToZSet(redisClient, leaderboardId, entry).catch(() => {});
            await invalidateEntriesCache(redisClient, leaderboardId);
            if (lockKey) await cacheDel(redisClient, lockKey);
        }

        const io = req.app.get('socketio');
        io.to(`leaderboard:${leaderboardId}`).emit('leaderboardChanged', { leaderboardId });

        res.status(201).json(entry);
    } catch (err) {
        if (lockKey && redisClient) await cacheDel(redisClient, lockKey).catch(() => {});
        res.status(400).json({ message: err.message });
    }
});

// Edit entry
router.put('/edit/:id', auth, validateObjectId(), validateLeaderboardEntryEdit, async (req, res) => {
    const { name, cgpa, marks } = req.body;

    try {
        const entry = await LeaderboardEntry.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: 'Entry not found' });

        if (entry.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to edit this entry' });
        }

        if (name !== undefined) entry.name = String(name).trim().slice(0, 100);
        if (cgpa !== undefined) entry.cgpa = parseFloat(cgpa);
        if (marks !== undefined) {
            entry.marks = (marks !== null) ? parseFloat(marks) : null;
        }
        entry.useMarks = entry.cgpa === 0;

        await entry.save();

        const redisClient = await getRedisClient().catch(() => null);
        if (redisClient) {
            await syncEntryToZSet(redisClient, entry.leaderboardId, entry).catch(() => {});
            await invalidateEntriesCache(redisClient, entry.leaderboardId);
        }

        const leaderboardId = entry.leaderboardId;
        const io = req.app.get('socketio');
        io.to(`leaderboard:${leaderboardId}`).emit('leaderboardChanged', { leaderboardId });

        res.json(entry);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete entry (with atomic entryCount decrement)
router.delete('/delete/:id', auth, async (req, res) => {
    try {
        const entry = await LeaderboardEntry.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: 'Entry not found' });

        const leaderboardId = entry.leaderboardId;

        // Check if user is the entry owner OR the leaderboard creator
        const leaderboard = await Leaderboard.findById(leaderboardId);
        const isOwner = entry.userId.toString() === req.user.id;
        const isCreator = leaderboard && leaderboard.createdBy.toString() === req.user.id;

        if (!isOwner && !isCreator) {
            return res.status(403).json({ message: 'Not authorized to delete this entry' });
        }

        await LeaderboardEntry.findByIdAndDelete(req.params.id);

        // Decrement entryCount atomically
        await Leaderboard.findByIdAndUpdate(leaderboardId, { $inc: { entryCount: -1 } }).catch(() => {});

        const redisClient = await getRedisClient().catch(() => null);
        if (redisClient) {
            await removeEntryFromZSet(redisClient, leaderboardId, req.params.id).catch(() => {});
            await invalidateEntriesCache(redisClient, leaderboardId);
        }

        const io = req.app.get('socketio');
        io.to(`leaderboard:${leaderboardId}`).emit('leaderboardChanged', { leaderboardId });

        res.json({ message: 'Entry deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add reaction (Heart) - Atomic toggle with targeted socket event (no cache wipe)
router.post('/react/:id', auth, async (req, res) => {
    try {
        const entry = await LeaderboardEntry.findById(req.params.id).select('_id leaderboardId userId likedBy dislikedBy');
        if (!entry) return res.status(404).json({ message: 'Entry not found' });

        const userId = req.user.id;
        const hasLike = hasUserReaction(entry.likedBy, userId);
        let updateQuery;
        let isLiked = false;

        if (hasLike) {
            // Unlike atomically via $pull
            updateQuery = {
                $pull: { likedBy: userId }
            };
            isLiked = false;
        } else {
            // Like atomically via $addToSet and pull any existing dislike
            updateQuery = {
                $addToSet: { likedBy: userId },
                $pull: { dislikedBy: userId }
            };
            isLiked = true;
        }

        const updatedEntry = await LeaderboardEntry.findByIdAndUpdate(
            req.params.id,
            updateQuery,
            { new: true, select: '_id leaderboardId userId likedBy dislikedBy' }
        );

        const io = req.app.get('socketio');

        // Broadcast targeted reaction update: clients update the row in-place with ZERO refetches
        io.to(`leaderboard:${updatedEntry.leaderboardId}`).emit('entryReactionUpdated', {
            leaderboardId: String(updatedEntry.leaderboardId),
            entryId: String(updatedEntry._id),
            hearts: updatedEntry.likedBy.length,
            dislikes: updatedEntry.dislikedBy.length,
            likedBy: updatedEntry.likedBy,
            dislikedBy: updatedEntry.dislikedBy,
            userId,
            action: isLiked ? 'liked' : 'unliked'
        });

        // Notify card owner only on like
        if (isLiked) {
            const user = await User.findById(userId).select('displayName').lean();
            const lb = await Leaderboard.findById(updatedEntry.leaderboardId).select('slug').lean();
            io.to(`user:${updatedEntry.userId}`).emit('globalNotification', {
                type: 'heart',
                message: `${user?.displayName || 'Someone'} liked your card!`,
                entryId: updatedEntry._id,
                target: `/lb/${lb?.slug || ''}`
            });
        }

        res.json({ hearts: updatedEntry.likedBy.length, isLiked, dislikes: updatedEntry.dislikedBy.length });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add reaction (ThumbsDown) - Atomic toggle with targeted socket event (no cache wipe)
router.post('/dislike/:id', auth, async (req, res) => {
    try {
        const entry = await LeaderboardEntry.findById(req.params.id).select('_id leaderboardId userId likedBy dislikedBy');
        if (!entry) return res.status(404).json({ message: 'Entry not found' });

        const userId = req.user.id;
        const hasDislike = hasUserReaction(entry.dislikedBy, userId);
        let updateQuery;
        let isDisliked = false;

        if (hasDislike) {
            // Undislike atomically via $pull
            updateQuery = {
                $pull: { dislikedBy: userId }
            };
            isDisliked = false;
        } else {
            // Dislike atomically via $addToSet and pull any existing like
            updateQuery = {
                $addToSet: { dislikedBy: userId },
                $pull: { likedBy: userId }
            };
            isDisliked = true;
        }

        const updatedEntry = await LeaderboardEntry.findByIdAndUpdate(
            req.params.id,
            updateQuery,
            { new: true, select: '_id leaderboardId userId likedBy dislikedBy' }
        );

        const io = req.app.get('socketio');

        // Broadcast targeted reaction update: clients update the row in-place with ZERO refetches
        io.to(`leaderboard:${updatedEntry.leaderboardId}`).emit('entryReactionUpdated', {
            leaderboardId: String(updatedEntry.leaderboardId),
            entryId: String(updatedEntry._id),
            hearts: updatedEntry.likedBy.length,
            dislikes: updatedEntry.dislikedBy.length,
            likedBy: updatedEntry.likedBy,
            dislikedBy: updatedEntry.dislikedBy,
            userId,
            action: isDisliked ? 'disliked' : 'undisliked'
        });

        // Notify card owner only on dislike
        if (isDisliked) {
            const user = await User.findById(userId).select('displayName').lean();
            const lb = await Leaderboard.findById(updatedEntry.leaderboardId).select('slug').lean();
            io.to(`user:${updatedEntry.userId}`).emit('globalNotification', {
                type: 'thumbs-down',
                message: `${user?.displayName || 'Someone'} disliked your card.`,
                entryId: updatedEntry._id,
                target: `/lb/${lb?.slug || ''}`
            });
        }

        res.json({ hearts: updatedEntry.likedBy.length, dislikes: updatedEntry.dislikedBy.length, isDisliked });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
