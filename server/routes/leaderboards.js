const express = require('express');
const router = express.Router();
const Leaderboard = require('../models/LeaderboardCollection');
const jwt = require('jsonwebtoken');

const { auth } = require('../middleware/auth');

// Create a new leaderboard
router.post('/create', auth, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    try {
        const existing = await Leaderboard.findOne({
            $or: [
                { slug },
                { name: { $regex: new RegExp(`^${name}$`, 'i') } }
            ]
        });
        if (existing) return res.status(400).json({ message: 'A leaderboard with this name already exists' });

        const leaderboard = new Leaderboard({
            name,
            slug,
            createdBy: req.user.id
        });

        await leaderboard.save();

        // Emit for real-time list update
        const io = req.app.get('socketio');
        io.emit('leaderboardCreated', leaderboard);

        res.status(201).json(leaderboard);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

const LeaderboardEntry = require('../models/Leaderboard');

// Get all leaderboards
router.get('/', async (req, res) => {
    try {
        const leaderboards = await Leaderboard.find().sort({ createdAt: -1 }).lean();

        // Add entry count for each leaderboard
        const enhancedLeaderboards = await Promise.all(leaderboards.map(async (lb) => {
            const entryCount = await LeaderboardEntry.countDocuments({ leaderboardId: lb._id });
            return { ...lb, entryCount };
        }));

        res.json(enhancedLeaderboards);
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
