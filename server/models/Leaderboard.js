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
        required: true,
        min: 0,
        max: 10,
    },
    marks: {
        type: Number,
        min: 0,
        max: 700,
    },
    useMarks: {
        type: Boolean,
        default: false,
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

// Prevent duplicate entries by the same user in a leaderboard (race condition defense)
LeaderboardSchema.index({ leaderboardId: 1, userId: 1 }, { unique: true });

// Compound index for fast ranking and cursor-based pagination
LeaderboardSchema.index({ leaderboardId: 1, cgpa: -1, marks: -1, _id: -1 });

module.exports = mongoose.model('LeaderboardEntry', LeaderboardSchema);
