const express = require('express');
const router = express.Router();
const Leaderboard = require('../models/LeaderboardCollection');
const jwt = require('jsonwebtoken');
const { buildEntryRankingPayload } = require('../utils/ranking');

const { auth } = require('../middleware/auth');
const { validateLeaderboardCreate, validateLeaderboardSettings, validateObjectId, validateSearchQuery } = require('../middleware/validation');

// Create a new leaderboard
router.post('/create', auth, validateLeaderboardCreate, async (req, res) => {
    const {
        name,
        entryMode = 'manual',
        fields = {},
        ranking = {},
        verification = {},
    } = req.body;
    const sanitizedName = String(name).trim().slice(0, 100);

    const slug = sanitizedName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    try {
        const existing = await Leaderboard.findOne({
            $or: [
                { slug },
                { name: { $eq: sanitizedName } }
            ]
        });
        if (existing) return res.status(400).json({ message: 'A leaderboard with this name already exists' });

        const leaderboard = new Leaderboard({
            name: sanitizedName,
            slug,
            createdBy: req.user.id,
            entryMode,
            fields,
            ranking,
            verification,
        });

        await leaderboard.save();

        const io = req.app.get('socketio');
        io.emit('leaderboardCreated', leaderboard);

        res.status(201).json(leaderboard);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

const LeaderboardEntry = require('../models/Leaderboard');

// Get all leaderboards (with pagination and search)
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const search = String(req.query.search || '').trim().slice(0, 100);
        const status = req.query.status;

        const query = {};
        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.name = { $regex: escapedSearch, $options: 'i' };
        }
        if (status === 'live') {
            query.isLive = true;
        } else if (status === 'maintenance') {
            query.isLive = false;
        }

        const skip = (page - 1) * limit;

        const totalBoards = await Leaderboard.countDocuments(query);
        const leaderboards = await Leaderboard.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Add entry count for each leaderboard
        const enhancedLeaderboards = await Promise.all(leaderboards.map(async (lb) => {
            const entryCount = await LeaderboardEntry.countDocuments({ leaderboardId: lb._id });
            return { ...lb, entryCount };
        }));

        res.json({
            leaderboards: enhancedLeaderboards,
            pagination: {
                totalBoards,
                totalPages: Math.ceil(totalBoards / limit),
                currentPage: page,
                limit
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get leaderboard by slug
router.get('/:slug', async (req, res) => {
    try {
        const leaderboard = await Leaderboard.findOne({ slug: req.params.slug });
        if (!leaderboard) return res.status(404).json({ message: 'Leaderboard not found' });
        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id/settings', auth, validateObjectId(), validateLeaderboardSettings, async (req, res) => {
    try {
        const leaderboard = await Leaderboard.findById(req.params.id);
        if (!leaderboard) return res.status(404).json({ message: 'Leaderboard not found' });

        const isCreator = leaderboard.createdBy.toString() === req.user.id;
        const isAdmin = req.user.isAdmin;
        if (!isCreator && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update this leaderboard' });
        }

        const updates = ['name', 'entryMode', 'fields', 'ranking', 'verification'];
        for (const key of updates) {
            if (req.body[key] !== undefined) {
                leaderboard[key] = req.body[key];
            }
        }

        if (req.body.name) {
            const sanitizedName = String(req.body.name).trim().slice(0, 100);
            leaderboard.name = sanitizedName;
            leaderboard.slug = sanitizedName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        }

        await leaderboard.save();
        res.json(leaderboard);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Toggle leaderboard status (Live/Down)
router.post('/toggle-status/:id', auth, async (req, res) => {
    try {
        const leaderboard = await Leaderboard.findById(req.params.id);
        if (!leaderboard) return res.status(404).json({ message: 'Leaderboard not found' });

        // Allow creator OR admins
        const isCreator = leaderboard.createdBy.toString() === req.user.id;
        const isAdmin = req.user.isAdmin;

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to change status' });
        }

        leaderboard.isLive = !leaderboard.isLive;
        await leaderboard.save();

        // Emit update to all clients viewing this board
        const io = req.app.get('socketio');
        io.emit(`statusUpdate:${leaderboard._id}`, { isLive: leaderboard.isLive });

        // Also emit for global list update
        io.emit('leaderboardStatusUpdated', { id: leaderboard._id, isLive: leaderboard.isLive });

        res.json(leaderboard);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete leaderboard (and all its entries)
router.delete('/:id', auth, async (req, res) => {
    try {
        const leaderboard = await Leaderboard.findById(req.params.id);
        if (!leaderboard) return res.status(404).json({ message: 'Leaderboard not found' });

        // Allow creator OR admins
        const isCreator = leaderboard.createdBy.toString() === req.user.id;
        const isAdmin = req.user.isAdmin;

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this leaderboard' });
        }

        const id = leaderboard._id;

        // Delete all entries associated with this leaderboard
        await LeaderboardEntry.deleteMany({ leaderboardId: id });

        // Delete the leaderboard itself
        await Leaderboard.findByIdAndDelete(req.params.id);

        // Emit real-time deletion
        const io = req.app.get('socketio');
        io.emit('leaderboardDeleted', id);

        res.json({ message: 'Leaderboard and all associated entries deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
