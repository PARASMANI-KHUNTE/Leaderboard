const express = require('express');
const router = express.Router();
const LeaderboardEntry = require('../models/Leaderboard');
const { User } = require('../models/User');
const jwt = require('jsonwebtoken');

const { auth } = require('../middleware/auth');

// Get all entries for a specific leaderboard (filtering out banned users)
router.get('/:leaderboardId', async (req, res) => {
    try {
        // First find all banned user IDs
        const bannedUsers = await User.find({ isBanned: true }).select('_id');
        const bannedUserIds = bannedUsers.map(u => u._id);

        const entries = await LeaderboardEntry.find({
            leaderboardId: req.params.leaderboardId,
            userId: { $nin: bannedUserIds }
        }).sort({ cgpa: -1, marks: -1 }); // Sort by CGPA, then Marks

        res.json(entries);
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

        // Emit real-time update for THIS leaderboard
        const io = req.app.get('socketio');
        const allEntries = await LeaderboardEntry.find({ leaderboardId }).sort({ cgpa: -1, marks: -1 });
        io.emit(`leaderboardUpdate:${leaderboardId}`, allEntries);

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

        const io = req.app.get('socketio');
        const allEntries = await LeaderboardEntry.find({ leaderboardId: entry.leaderboardId }).sort({ cgpa: -1, marks: -1 });
        io.emit(`leaderboardUpdate:${entry.leaderboardId}`, allEntries);

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

        const io = req.app.get('socketio');
        const allEntries = await LeaderboardEntry.find({ leaderboardId }).sort({ cgpa: -1 });
        io.emit(`leaderboardUpdate:${leaderboardId}`, allEntries);

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

        const io = req.app.get('socketio');
        io.emit(`reactionUpdate:${entry.leaderboardId}`, {
            entryId: entry._id,
            likedBy: entry.likedBy,
            hearts: entry.likedBy.length,
            dislikedBy: entry.dislikedBy,
            dislikes: entry.dislikedBy.length
        });

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

        const io = req.app.get('socketio');
        io.emit(`reactionUpdate:${entry.leaderboardId}`, {
            entryId: entry._id,
            likedBy: entry.likedBy,
            hearts: entry.likedBy.length,
            dislikedBy: entry.dislikedBy,
            dislikes: entry.dislikedBy.length
        });

        res.json({ hearts: entry.likedBy.length, dislikes: entry.dislikedBy.length, isDisliked });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


module.exports = router;
