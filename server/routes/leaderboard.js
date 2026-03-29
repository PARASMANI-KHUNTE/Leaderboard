const express = require('express');
const router = express.Router();
const LeaderboardEntry = require('../models/Leaderboard');
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
const { getRankingFields, buildEntryRankingPayload, normalizeFieldValue } = require('../utils/ranking');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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
    const { getVersion } = require('../config/redis');
    return await getVersion(redisClient, 'lb:ban:version');
}

async function getEntriesVersion(redisClient, leaderboardId) {
    const { getVersion } = require('../config/redis');
    return await getVersion(redisClient, `lb:${leaderboardId}:version`);
}

async function invalidateEntriesCache(redisClient, leaderboardId) {
    // We use versioned cache keys, so invalidation is a cheap INCR.
    const { bumpVersion } = require('../config/redis');
    await bumpVersion(redisClient, `lb:${leaderboardId}:version`);
}

// Get entries for a specific leaderboard (cursor-based + stable ordering)
router.get('/:leaderboardId', async (req, res) => {
    try {
        const { leaderboardId } = req.params;
        const Leaderboard = require('../models/LeaderboardCollection');
        const leaderboard = await Leaderboard.findById(leaderboardId).lean();
        if (!leaderboard) return res.status(404).json({ message: 'Leaderboard not found' });

        const rawLimit = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
        const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);
        const cursor = decodeCursor(req.query.cursor);

        const page = cursor?.page ? Number(cursor.page) : 1;
        const cursorCgpa = cursor?.cgpa;
        const cursorMarks = cursor?.marks;
        const cursorId = cursor?.id ? new mongoose.Types.ObjectId(cursor.id) : null;

        // First find all banned user IDs (to exclude them from results + rank calc)
        const bannedUsers = await User.find({ isBanned: true }).select('_id');
        const bannedUserIds = bannedUsers.map(u => u._id);

        const redisClient = await (async () => {
            try {
                const { getRedisClient } = require('../config/redis');
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

        if (canCache) {
            const [banVersion, entriesVersion] = await Promise.all([
                getBanVersion(redisClient),
                getEntriesVersion(redisClient, leaderboardId),
            ]);
            const cacheKey = `lb:${leaderboardId}:entries:page:${page}:limit:${limit}:banV:${banVersion}:v:${entriesVersion}`;
            const cached = await require('../config/redis').cacheGet(redisClient, cacheKey);
            if (cached) return res.json(cached);
        }

        const matchBase = {
            leaderboardId: new mongoose.Types.ObjectId(leaderboardId),
            userId: { $nin: bannedUserIds },
            verificationStatus: { $nin: ['rejected'] },
        };

        const rankingFields = getRankingFields(leaderboard);
        const primaryField = rankingFields[0] === 'rankingScore' ? 'rankingScore' : (rankingFields[0] || 'cgpa');
        const secondaryField = rankingFields[1] || 'marks';
        const cursorPrimary = cursor?.primary;
        const cursorSecondary = cursor?.secondary;

        const pipeline = [
            { $match: matchBase },
            {
                $addFields: {
                    tieScore: {
                        $add: [
                            { $multiply: [{ $ifNull: [`$${primaryField}`, 0] }, 1000000] },
                            { $ifNull: [`$${secondaryField}`, 0] },
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

        if (cursorId && cursorPrimary !== undefined && cursorSecondary !== undefined) {
            pipeline.push({
                $match: {
                    $or: [
                        { [primaryField]: { $lt: cursorPrimary } },
                        {
                            [primaryField]: cursorPrimary,
                            [secondaryField]: { $lt: cursorSecondary },
                        },
                        {
                            [primaryField]: cursorPrimary,
                            [secondaryField]: cursorSecondary,
                            _id: { $lt: cursorId },
                        },
                    ],
                },
            });
        }

        pipeline.push(
            { $sort: { [primaryField]: -1, [secondaryField]: -1, _id: -1 } },
            { $limit: limit + 1 },
            {
                $project: {
                    // Keep fields required by the frontend UI.
                    _id: 1,
                    leaderboardId: 1,
                    userId: 1,
                    name: 1,
                    cgpa: 1,
                    sgpa: 1,
                    marks: 1,
                    useMarks: 1,
                    verificationStatus: 1,
                    verificationSubmissionId: 1,
                    rankingScore: 1,
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
                primary: last[primaryField] ?? 0,
                secondary: last[secondaryField] ?? 0,
                id: last._id.toString(),
                page: page + 1,
            });
        }

        const response = {
            items,
            hasMore,
            nextCursor,
            page,
            ranking: {
                primaryField,
                secondaryField,
                mode: leaderboard.ranking?.mode || 'priority',
            },
        };

        if (canCache) {
            const [banVersion, entriesVersion] = await Promise.all([
                getBanVersion(redisClient),
                getEntriesVersion(redisClient, leaderboardId),
            ]);
            const cacheKey = `lb:${leaderboardId}:entries:page:${page}:limit:${limit}:banV:${banVersion}:v:${entriesVersion}`;
            await require('../config/redis').cacheSet(redisClient, cacheKey, response, Number(process.env.REDIS_CACHE_TTL_SECONDS) || 45);
        }

        res.json(response);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Submit entry
router.post('/submit', auth, validateLeaderboardEntry, async (req, res) => {
    const { name, cgpa, sgpa, marks, leaderboardId } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const Leaderboard = require('../models/LeaderboardCollection');
        const leaderboard = await Leaderboard.findById(leaderboardId);
        if (!leaderboard) return res.status(404).json({ message: 'Leaderboard not found' });
        if (!leaderboard.isLive) return res.status(403).json({ message: 'This leaderboard is currently closed for submissions' });
        if (leaderboard.entryMode === 'upload') {
            return res.status(400).json({ message: 'This leaderboard accepts document uploads only' });
        }

        const existingEntry = await LeaderboardEntry.findOne({ userId: user._id, leaderboardId });
        if (existingEntry) {
            return res.status(400).json({ message: 'You have already made an entry in this leaderboard' });
        }

        const metrics = {
            cgpa: cgpa !== undefined && cgpa !== null ? parseFloat(cgpa) : null,
            sgpa: sgpa !== undefined && sgpa !== null ? parseFloat(sgpa) : null,
            marks: marks !== null && marks !== undefined ? parseFloat(marks) : null,
        };

        if (leaderboard.fields?.cgpa === false) metrics.cgpa = null;
        if (leaderboard.fields?.sgpa === false) metrics.sgpa = null;
        if (leaderboard.fields?.marks === false) metrics.marks = null;

        const rankingPayload = buildEntryRankingPayload(leaderboard, metrics);
        const entry = new LeaderboardEntry({
            leaderboardId,
            userId: user._id,
            name: String(name).trim().slice(0, 100),
            cgpa: metrics.cgpa,
            sgpa: metrics.sgpa,
            marks: metrics.marks,
            userPicture: user.profilePicture,
            verificationStatus: 'manual',
            ...rankingPayload,
        });

        await entry.save();

        const { getRedisClient } = require('../config/redis');
        const redisClient = await getRedisClient();
        if (redisClient) await invalidateEntriesCache(redisClient, leaderboardId);

        const io = req.app.get('socketio');
        io.to(`leaderboard:${leaderboardId}`).emit('leaderboardChanged', { leaderboardId });

        res.status(201).json(entry);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Edit entry
router.put('/edit/:id', auth, validateObjectId(), validateLeaderboardEntryEdit, async (req, res) => {
    const { name, cgpa, sgpa, marks } = req.body;

    try {
        const entry = await LeaderboardEntry.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: 'Entry not found' });

        if (entry.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to edit this entry' });
        }

        const Leaderboard = require('../models/LeaderboardCollection');
        const leaderboard = await Leaderboard.findById(entry.leaderboardId);
        if (!leaderboard) return res.status(404).json({ message: 'Leaderboard not found' });

        if (name !== undefined) entry.name = String(name).trim().slice(0, 100);
        if (cgpa !== undefined) entry.cgpa = parseFloat(cgpa);
        if (sgpa !== undefined) entry.sgpa = parseFloat(sgpa);
        if (marks !== undefined) {
            entry.marks = (marks !== null) ? parseFloat(marks) : null;
        }
        const rankingPayload = buildEntryRankingPayload(leaderboard, {
            cgpa: entry.cgpa,
            sgpa: entry.sgpa,
            marks: entry.marks,
        });
        entry.useMarks = rankingPayload.useMarks;
        entry.rankingScore = rankingPayload.rankingScore;

        await entry.save();

        const { getRedisClient } = require('../config/redis');
        const redisClient = await getRedisClient();
        if (redisClient) await invalidateEntriesCache(redisClient, entry.leaderboardId);

        const leaderboardId = entry.leaderboardId;
        const io = req.app.get('socketio');
        io.to(`leaderboard:${leaderboardId}`).emit('leaderboardChanged', { leaderboardId });

        res.json(entry);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete entry
router.delete('/delete/:id', auth, async (req, res) => {
    try {
        const entry = await LeaderboardEntry.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: 'Entry not found' });

        const leaderboardId = entry.leaderboardId;

        // Check if user is the entry owner OR the leaderboard creator
        const Leaderboard = require('../models/LeaderboardCollection');
        const leaderboard = await Leaderboard.findById(leaderboardId);

        const isOwner = entry.userId.toString() === req.user.id;
        const isCreator = leaderboard && leaderboard.createdBy.toString() === req.user.id;

        if (!isOwner && !isCreator) {
            return res.status(403).json({ message: 'Not authorized to delete this entry' });
        }

        await LeaderboardEntry.findByIdAndDelete(req.params.id);

        const { getRedisClient } = require('../config/redis');
        const redisClient = await getRedisClient();
        if (redisClient) await invalidateEntriesCache(redisClient, leaderboardId);

        const io = req.app.get('socketio');
        io.to(`leaderboard:${leaderboardId}`).emit('leaderboardChanged', { leaderboardId });

        res.json({ message: 'Entry deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add reaction (Heart) - Toggles Like
router.post('/react/:id', auth, async (req, res) => {
    try {
        const entry = await LeaderboardEntry.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: 'Entry not found' });

        const userId = req.user.id;
        if (!entry.likedBy) entry.likedBy = [];
        if (!entry.dislikedBy) entry.dislikedBy = [];
        const hasLike = hasUserReaction(entry.likedBy, userId);
        const hasDislike = hasUserReaction(entry.dislikedBy, userId);

        let isLiked = false;

        // If currently disliked, remove the dislike
        if (hasDislike) {
            entry.dislikedBy = removeUserReaction(entry.dislikedBy, userId);
        }

        if (hasLike) {
            // Unlike
            entry.likedBy = removeUserReaction(entry.likedBy, userId);
        } else {
            // Like
            entry.likedBy.push(userId);
            isLiked = true;

            // Only notify on like, not unlike
            const io = req.app.get('socketio');
            const user = await User.findById(userId);
            const Leaderboard = require('../models/LeaderboardCollection');
            const leaderboard = await Leaderboard.findById(entry.leaderboardId);
            io.to(`user:${entry.userId}`).emit('globalNotification', {
                type: 'heart',
                message: `${user.displayName} liked your card!`,
                entryId: entry._id,
                target: `/lb/${leaderboard.slug}`
            });
        }

        await entry.save();

        const { getRedisClient } = require('../config/redis');
        const redisClient = await getRedisClient();
        if (redisClient) await invalidateEntriesCache(redisClient, entry.leaderboardId);

        const io = req.app.get('socketio');
        io.to(`leaderboard:${entry.leaderboardId}`).emit('leaderboardChanged', { leaderboardId: entry.leaderboardId });

        res.json({ hearts: entry.likedBy.length, isLiked, dislikes: entry.dislikedBy.length });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Add reaction (ThumbsDown) - Toggles Dislike
router.post('/dislike/:id', auth, async (req, res) => {
    try {
        const entry = await LeaderboardEntry.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: 'Entry not found' });

        const userId = req.user.id;
        if (!entry.likedBy) entry.likedBy = [];
        if (!entry.dislikedBy) entry.dislikedBy = [];
        const hasLike = hasUserReaction(entry.likedBy, userId);
        const hasDislike = hasUserReaction(entry.dislikedBy, userId);

        let isDisliked = false;

        // If currently liked, remove the like
        if (hasLike) {
            entry.likedBy = removeUserReaction(entry.likedBy, userId);
        }

        if (hasDislike) {
            // Undislike
            entry.dislikedBy = removeUserReaction(entry.dislikedBy, userId);
        } else {
            // Dislike
            entry.dislikedBy.push(userId);
            isDisliked = true;

            // Notify on dislike
            const io = req.app.get('socketio');
            const user = await User.findById(userId);
            const Leaderboard = require('../models/LeaderboardCollection');
            const leaderboard = await Leaderboard.findById(entry.leaderboardId);
            
            io.to(`user:${entry.userId}`).emit('globalNotification', {
                type: 'thumbs-down', // Frontend will pick an icon
                message: `${user.displayName} disliked your card.`,
                entryId: entry._id,
                target: `/lb/${leaderboard.slug}`
            });
        }

        await entry.save();

        const { getRedisClient } = require('../config/redis');
        const redisClient = await getRedisClient();
        if (redisClient) await invalidateEntriesCache(redisClient, entry.leaderboardId);

        const io = req.app.get('socketio');
        io.to(`leaderboard:${entry.leaderboardId}`).emit('leaderboardChanged', { leaderboardId: entry.leaderboardId });

        res.json({ hearts: entry.likedBy.length, dislikes: entry.dislikedBy.length, isDisliked });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


module.exports = router;
