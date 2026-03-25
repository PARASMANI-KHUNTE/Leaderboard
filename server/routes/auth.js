const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

router.get('/google',
    (req, res, next) => {
        const platform = req.query.platform === 'mobile' ? 'mobile' : 'web';
        const forwardedProto = req.headers['x-forwarded-proto'];
        const proto = forwardedProto
            ? String(forwardedProto).split(',')[0].trim()
            : req.protocol;
        const host = req.get('host');
        const safeProto =
            proto === 'http' && host && host.includes('onrender.com') ? 'https' : proto;
        const callbackURL =
            process.env.GOOGLE_CALLBACK_URL ||
            `${safeProto}://${host}/auth/google/callback`;
        
        console.log('[OAuth] Init - proto:', proto, 'host:', host, 'safeProto:', safeProto, 'callbackURL:', callbackURL, 'GOOGLE_CALLBACK_URL env:', process.env.GOOGLE_CALLBACK_URL);
        
        // Encode platform + mobile redirect URL into the state param.
        // Google passes state back to the callback unchanged — reliable unlike sessions.
        const statePayload = { platform, redirectUrl: req.query.redirect || null };
        const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

        passport.authenticate('google', {
            scope: ['profile', 'email'],
            callbackURL,
            state,
        })(req, res, next);
    });

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    async (req, res) => {
        try {
            // Decode state payload (base64url JSON: { platform, redirectUrl })
            // Falls back to legacy plain-text state for backwards compatibility.
            let platform = 'web';
            let mobileRedirectUrl = null;
            try {
                const stateRaw = req.query?.state || '';
                const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString());
                platform = decoded.platform || 'web';
                mobileRedirectUrl = decoded.redirectUrl || null;
            } catch {
                // Legacy: state was just the platform string
                platform = req.query?.state === 'mobile' ? 'mobile' : 'web';
            }

            console.log(`[OAuth Callback] platform=${platform} user=${req.user?._id} redirectUrl=${mobileRedirectUrl}`);

            // Web continues to use the existing token-in-URL flow for compatibility.
            if (platform !== 'mobile') {
                const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
                return res.redirect(`${process.env.CLIENT_URL}/login-success?token=${token}`);
            }

            // Mobile gets a short-lived one-time code (no JWT in URL).
            const AuthCode = require('../models/AuthCode');
            const oneTimeCode = crypto.randomBytes(24).toString('hex'); // 48-char hex
            const codeHash = crypto.createHash('sha256').update(oneTimeCode).digest('hex');
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            await AuthCode.create({
                userId: req.user._id,
                codeHash,
                expiresAt,
                used: false,
            });

            // Use client's dynamic redirect URL from state, fall back to env var for production standalone
            const deepLinkBase = mobileRedirectUrl || process.env.MOBILE_DEEPLINK_URL || 'eliteboards://login-success';
            console.log(`[OAuth Callback] Redirecting mobile user to deep link: ${deepLinkBase}`);
            return res.redirect(`${deepLinkBase}?code=${encodeURIComponent(oneTimeCode)}`);
        } catch (err) {
            console.error('[OAuth Callback ERROR]', err);
            return res.status(500).json({ error: 'OAuth callback failed', message: err.message });
        }
    });

// Exchange one-time code for a JWT (used by the mobile deep link flow).
router.post('/exchange', async (req, res) => {
    try {
        const { code } = req.body || {};
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ message: 'Missing or invalid code' });
        }

        const AuthCode = require('../models/AuthCode');
        const { User } = require('../models/User');

        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        const now = new Date();

        // Atomic check: mark as used only if the code is still valid.
        const authCode = await AuthCode.findOneAndUpdate(
            { codeHash, used: false, expiresAt: { $gt: now } },
            { $set: { used: true } },
            { new: false }
        );

        if (!authCode) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }

        const user = await User.findById(authCode.userId).select('_id googleId displayName isAdmin isBanned email profilePicture');
        if (!user) {
            return res.status(400).json({ message: 'User not found for this code' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token });
    } catch (err) {
        return res.status(500).json({ message: err.message || 'Exchange failed' });
    }
});

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect(process.env.CLIENT_URL);
});

// Diagnostic endpoint — shows which critical env vars are configured (NOT the values)
router.get('/debug', (req, res) => {
    const placeholders = ['your_session_secret', 'your_jwt_secret'];
    const check = (key) => {
        const val = process.env[key];
        if (!val) return 'MISSING';
        if (placeholders.includes(val)) return 'PLACEHOLDER (not secure!)';
        return 'SET';
    };
    res.json({
        GOOGLE_CLIENT_ID: check('GOOGLE_CLIENT_ID'),
        GOOGLE_CLIENT_SECRET: check('GOOGLE_CLIENT_SECRET'),
        GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'MISSING',
        SESSION_SECRET: check('SESSION_SECRET'),
        JWT_SECRET: check('JWT_SECRET'),
        CLIENT_URL: process.env.CLIENT_URL || 'MISSING',
        MONGODB_URI: process.env.MONGODB_URI ? (process.env.MONGODB_URI.startsWith('mongodb://localhost') ? 'LOCAL (will fail on Render!)' : 'REMOTE') : 'MISSING',
        MOBILE_DEEPLINK_URL: process.env.MOBILE_DEEPLINK_URL || 'MISSING (will default to eliteboards://login-success)',
    });
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
