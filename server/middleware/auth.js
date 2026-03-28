const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const getTokenFromRequest = (req) => {
    const bearerToken = req.header('Authorization')?.replace('Bearer ', '');
    if (bearerToken) return bearerToken;
    
    const cookieToken = req.cookies?.token;
    if (cookieToken) return cookieToken;
    
    return null;
};

const auth = async (req, res, next) => {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) return res.status(401).json({ message: 'User not found' });
        if (user.isBanned) return res.status(403).json({ message: 'Your account has been banned' });

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

const admin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

module.exports = { getTokenFromRequest, auth, admin };
