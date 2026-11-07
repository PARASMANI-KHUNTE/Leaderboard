const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    isLive: {
        type: Boolean,
        default: true,
    },
    entryCount: {
        type: Number,
        default: 0,
        min: 0,
    },
}, { timestamps: true });

// Index for filtering live/maintenance boards and ordering by creation date
LeaderboardSchema.index({ isLive: 1, createdAt: -1 });

module.exports = mongoose.model('Leaderboard', LeaderboardSchema);
