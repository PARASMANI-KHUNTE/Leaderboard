const express = require('express');
const router = express.Router();
const LeaderboardEntry = require('../models/Leaderboard');
const { User } = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { auth } = require('../middleware/auth');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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
        };

        const pipeline = [
            { $match: matchBase },
            // Compute a single composite tie key so MongoDB can apply `$rank`
            // (it requires `sortBy` to contain exactly one element).
            // Ordering still behaves like `(cgpa desc, marks desc)` and ties are based
            // on identical `(cgpa, marks)`.
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
            // Compute global, tie-aware rank using only `(cgpa, marks)` as the tie key.
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
        if (cursorId && cursorCgpa !== undefined && cursorMarks !== undefined) {
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
                    // Keep fields required by the frontend UI.
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
router.post('/submit', auth, async (req, res) => {
    const { name, cgpa, marks, leaderboardId } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if leaderboard is LIVE
        const Leaderboard = require('../models/LeaderboardCollection');
        const leaderboard = await Leaderboard.findById(leaderboardId);
        if (!leaderboard) return res.status(404).json({ message: 'Leaderboard not found' });
        if (!leaderboard.isLive) return res.status(403).json({ message: 'This leaderboard is currently closed for submissions' });

        // Check if user already submitted to THIS leaderboard
        const existingEntry = await LeaderboardEntry.findOne({ userId: user._id, leaderboardId });
        if (existingEntry) {
            return res.status(400).json({ message: 'You have already made an entry in this leaderboard' });
        }

        const useMarks = parseFloat(cgpa) === 0;
        const entry = new LeaderboardEntry({
            leaderboardId,
            userId: user._id,
            name,
            cgpa: parseFloat(cgpa),
            marks: (marks !== null && marks !== undefined) ? parseFloat(marks) : null,
            useMarks,
            userPicture: user.profilePicture
        });

        await entry.save();

        // Invalidate cached pages (version bump)
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
router.put('/edit/:id', auth, async (req, res) => {
    const { name, cgpa, marks } = req.body;

    try {
        const entry = await LeaderboardEntry.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: 'Entry not found' });

        if (entry.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to edit this entry' });
        }

        entry.name = name || entry.name;
        if (cgpa !== undefined) entry.cgpa = parseFloat(cgpa);
        if (marks !== undefined) {
            entry.marks = (marks !== null) ? parseFloat(marks) : null;
        }
        entry.useMarks = entry.cgpa === 0;

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
        const likeIndex = entry.likedBy.indexOf(userId);
        const dislikeIndex = entry.dislikedBy.indexOf(userId);

        let isLiked = false;

        // If currently disliked, remove the dislike
        if (dislikeIndex > -1) {
            entry.dislikedBy.splice(dislikeIndex, 1);
        }

        if (likeIndex > -1) {
            // Unlike
            entry.likedBy.splice(likeIndex, 1);
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
        const likeIndex = entry.likedBy.indexOf(userId);
        const dislikeIndex = entry.dislikedBy.indexOf(userId);

        let isDisliked = false;

        // If currently liked, remove the like
        if (likeIndex > -1) {
            entry.likedBy.splice(likeIndex, 1);
        }

        if (dislikeIndex > -1) {
            // Undislike
            entry.dislikedBy.splice(dislikeIndex, 1);
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
