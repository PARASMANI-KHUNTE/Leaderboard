const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true,
    },
    displayName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    isBanned: {
        type: Boolean,
        default: false,
    },
    profilePicture: String,
    hasSubmitted: {
        type: Boolean,
        default: false,
    },
    pushSubscriptions: [{
        endpoint: String,
        expirationTime: Number,
        keys: {
            p256dh: String,
            auth: String
        }
    }]
}, { timestamps: true });

const ReportSchema = new mongoose.Schema({
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaderboardEntry', required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'resolved', 'ignored'], default: 'pending' }
}, { timestamps: true });

const FeedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    text: { type: String, required: true },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Report = mongoose.model('Report', ReportSchema);
const Feedback = mongoose.model('Feedback', FeedbackSchema);

module.exports = { User, Report, Feedback };
