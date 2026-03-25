const express = require('express');
const router = express.Router();
const { User, Report, Feedback } = require('../models/User');
const LeaderboardEntry = require('../models/Leaderboard');
const { auth, admin } = require('../middleware/auth');
const mongoose = require('mongoose');

// Get all reports
router.get('/reports', auth, admin, async (req, res) => {
    try {
        const reports = await Report.find({ status: 'pending' })
            .populate('entryId')
            .populate('reporterId', 'displayName email')
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all feedback
router.get('/feedback', auth, admin, async (req, res) => {
    try {
        const feedback = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedback);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Ban/Unban user
router.post('/toggle-ban/:userId', auth, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isBanned = !user.isBanned;
        await user.save();

        // Invalidate cached entry/rank results by bumping ban version.
        const { getRedisClient, bumpVersion } = require('../config/redis');
        const redisClient = await getRedisClient();
        if (redisClient) {
            await bumpVersion(redisClient, 'lb:ban:version');
        }

        res.json({ message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Resolve report (and optionally delete entry)
router.post('/resolve-report/:reportId', auth, admin, async (req, res) => {
    const { action } = req.body; // 'delete' or 'ignore'
    try {
        const report = await Report.findById(req.params.reportId);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        if (action === 'delete') {
            const entry = await LeaderboardEntry.findById(report.entryId);
            const leaderboardId = entry?.leaderboardId;

            await LeaderboardEntry.findByIdAndDelete(report.entryId);

            // Invalidate leaderboard entry/rank cache + notify live clients.
            if (leaderboardId) {
                const io = req.app.get('socketio');
                const { getRedisClient, bumpVersion } = require('../config/redis');
                const redisClient = await getRedisClient();
                if (redisClient) await bumpVersion(redisClient, `lb:${leaderboardId}:version`);

                io.to(`leaderboard:${leaderboardId}`).emit('leaderboardChanged', { leaderboardId });
            }
        }

        report.status = action === 'delete' ? 'resolved' : 'ignored';
        await report.save();
        res.json({ message: 'Report handled' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all users with search and report counts
router.get('/users', auth, admin, async (req, res) => {
    const { search } = req.query;
    try {
        let query = {};
        if (search) {
            query = {
                $or: [
                    { displayName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const users = await User.find(query).lean();

        // Enhance users with report counts
        const enhancedUsers = await Promise.all(users.map(async (u) => {
            // Find entries by this user
            const userEntries = await LeaderboardEntry.find({ userId: u._id }).select('_id');
            const entryIds = userEntries.map(e => e._id);

            // Count reports for these entries
            const reportCount = await Report.countDocuments({ entryId: { $in: entryIds } });

            return { ...u, reportCount };
        }));

        res.json(enhancedUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete feedback
router.delete('/feedback/:id', auth, admin, async (req, res) => {
    try {
        await Feedback.findByIdAndDelete(req.params.id);
        res.json({ message: 'Feedback deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Toggle feedback read status
router.patch('/feedback/:id/toggle-read', auth, admin, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

        feedback.isRead = !feedback.isRead;
        await feedback.save();
        res.json(feedback);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete user (admin action with cascading cleanup)
router.delete('/user/:id', auth, admin, async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const userObjectId = new mongoose.Types.ObjectId(userId);

        // 0. Collect affected leaderboardIds before deleting entries
        const affected = await LeaderboardEntry.find({ userId: userObjectId }).select('leaderboardId').lean();
        const leaderboardIds = [...new Set(affected.map((e) => String(e.leaderboardId)))];

        // 1. Remove all entries by user
        await LeaderboardEntry.deleteMany({ userId: userObjectId });

        // 2. Pull user's ID from all likedBy and dislikedBy arrays
        await LeaderboardEntry.updateMany(
            { likedBy: userObjectId },
            { $pull: { likedBy: userObjectId } }
        );
        await LeaderboardEntry.updateMany(
            { dislikedBy: userObjectId },
            { $pull: { dislikedBy: userObjectId } }
        );

        // 3. Remove user's reports and feedback
        await Report.deleteMany({ reporterId: userObjectId });
        await Feedback.deleteMany({ userId: userObjectId });

        // 4. Delete user document
        await User.findByIdAndDelete(userId);

        // Invalidate caches + notify live clients for each affected leaderboard.
        if (leaderboardIds.length > 0) {
            const io = req.app.get('socketio');
            const { getRedisClient, bumpVersion } = require('../config/redis');
            const redisClient = await getRedisClient();

            await Promise.all([
                ...(redisClient
                    ? leaderboardIds.map((lbId) => bumpVersion(redisClient, `lb:${lbId}:version`))
                    : []),
            ]);

            leaderboardIds.forEach((lbId) => {
                io.to(`leaderboard:${lbId}`).emit('leaderboardChanged', { leaderboardId: lbId });
            });
        }

        res.json({ message: 'User and all related data deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
