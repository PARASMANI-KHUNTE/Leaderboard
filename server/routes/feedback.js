const express = require('express');
const router = express.Router();
const { Feedback } = require('../models/User');
const { auth } = require('../middleware/auth');

// Submit feedback
router.post('/submit', auth, async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Feedback text is required' });

    try {
        const feedback = new Feedback({
            userId: req.user._id,
            userName: req.user.displayName,
            text
        });
        await feedback.save();

        const io = req.app.get('socketio');
        io.to('admins').emit('globalNotification', {
            type: 'info',
            message: `New feedback from ${req.user.displayName}!`,
            target: '/admin?tab=feedback'
        });

        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
