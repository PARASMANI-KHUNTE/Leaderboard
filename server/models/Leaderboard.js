const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
    leaderboardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Leaderboard',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    cgpa: {
        type: Number,
        min: 0,
        max: 10,
        default: null,
    },
    sgpa: {
        type: Number,
        min: 0,
        max: 10,
        default: null,
    },
    marks: {
        type: Number,
        min: 0,
        max: 700,
        default: null,
    },
    useMarks: {
        type: Boolean,
        default: false,
    },
    verificationStatus: {
        type: String,
        enum: ['manual', 'pending', 'verified', 'needs_review', 'rejected'],
        default: 'manual',
    },
    verificationSubmissionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VerificationSubmission',
        default: null,
    },
    rankingScore: {
        type: Number,
        default: 0,
    },
    userPicture: String,
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dislikedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('LeaderboardEntry', LeaderboardSchema);
