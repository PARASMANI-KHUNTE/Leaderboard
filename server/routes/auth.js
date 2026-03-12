const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Generate JWT
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Redirect to frontend with token
        res.redirect(`${process.env.CLIENT_URL}/login-success?token=${token}`);
    });

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect(process.env.CLIENT_URL);
});

const { auth } = require('../middleware/auth');

router.get('/profile', auth, (req, res) => {
    res.json({
        id: req.user._id,
        name: req.user.displayName,
        email: req.user.email,
        picture: req.user.profilePicture,
        isAdmin: req.user.isAdmin,
        isBanned: req.user.isBanned
    });
});

// Delete account (cascading cleanup)
router.delete('/delete-account', auth, async (req, res) => {
    const userId = req.user._id;

    try {
        const LeaderboardEntry = require('../models/Leaderboard');
        const { User, Report, Feedback } = require('../models/User');

        // 1. Remove all entries by user
        await LeaderboardEntry.deleteMany({ userId });

        // 2. Pull user's ID from all likedBy and dislikedBy arrays
        await LeaderboardEntry.updateMany(
            { likedBy: userId },
            { $pull: { likedBy: userId } }
        );
        await LeaderboardEntry.updateMany(
            { dislikedBy: userId },
            { $pull: { dislikedBy: userId } }
        );

        // 3. Remove user's reports and feedback
        await Report.deleteMany({ reporterId: userId });
        await Feedback.deleteMany({ userId });

        // 4. Delete user document
        await User.findByIdAndDelete(userId);

        res.json({ message: 'Account and all related data deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
