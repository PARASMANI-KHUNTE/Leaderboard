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
    }]
}, { timestamps: true });

module.exports = mongoose.model('LeaderboardEntry', LeaderboardSchema);
