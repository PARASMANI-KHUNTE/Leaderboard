const express = require('express');
const router = express.Router();
const { User } = require('../models/User');
const { auth } = require('../middleware/auth');
const { pushNotificationsEnabled } = require('../utils/push');

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
    if (!pushNotificationsEnabled) {
        return res.status(503).json({ message: 'Push notifications are disabled on this server' });
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
        return res.status(500).json({ message: 'VAPID public key not found on server' });
    }
    res.json({ publicKey: vapidPublicKey });
});

// Subscribe to push notifications
router.post('/subscribe', auth, async (req, res) => {
    if (!pushNotificationsEnabled) {
        return res.status(503).json({ message: 'Push notifications are disabled on this server' });
    }

    const subscription = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: 'Invalid subscription object' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Add the subscription if it doesn't already exist for the user
        const alreadyExists = user.pushSubscriptions.some(
            (s) => s.endpoint === subscription.endpoint
        );

        if (!alreadyExists) {
            user.pushSubscriptions.push(subscription);
            await user.save();
        }

        res.status(201).json({ message: 'Push subscription saved successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', auth, async (req, res) => {
    if (!pushNotificationsEnabled) {
        return res.status(503).json({ message: 'Push notifications are disabled on this server' });
    }

    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: 'Invalid subscription object' });
    }

    try {
        await User.updateOne(
            { _id: req.user.id },
            { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } }
        );
        res.json({ message: 'Push subscription removed successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
