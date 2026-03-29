const mongoose = require('mongoose');

const leaderboardFieldSchema = new mongoose.Schema({
    cgpa: { type: Boolean, default: true },
    sgpa: { type: Boolean, default: false },
    marks: { type: Boolean, default: true },
}, { _id: false });

const weightedRankingSchema = new mongoose.Schema({
    cgpa: { type: Number, min: 0, max: 1, default: 0 },
    sgpa: { type: Number, min: 0, max: 1, default: 0 },
    marks: { type: Number, min: 0, max: 1, default: 0 },
}, { _id: false });

const rankingSchema = new mongoose.Schema({
    mode: {
        type: String,
        enum: ['single', 'priority', 'weighted'],
        default: 'priority',
    },
    primaryField: {
        type: String,
        enum: ['cgpa', 'sgpa', 'marks'],
        default: 'cgpa',
    },
    secondaryField: {
        type: String,
        enum: ['cgpa', 'sgpa', 'marks', null],
        default: 'marks',
    },
    weighted: {
        type: weightedRankingSchema,
        default: () => ({}),
    },
}, { _id: false });

const verificationSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ['none', 'identity_match', 'document_verification', 'manual_approval'],
        default: 'none',
    },
    requireIdCard: {
        type: Boolean,
        default: false,
    },
    requireGradeCard: {
        type: Boolean,
        default: false,
    },
    autoAcceptOnIdentityMatch: {
        type: Boolean,
        default: true,
    },
}, { _id: false });

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
    entryMode: {
        type: String,
        enum: ['manual', 'upload', 'hybrid'],
        default: 'manual',
    },
    fields: {
        type: leaderboardFieldSchema,
        default: () => ({}),
    },
    ranking: {
        type: rankingSchema,
        default: () => ({}),
    },
    verification: {
        type: verificationSchema,
        default: () => ({}),
    },
}, { timestamps: true });

module.exports = mongoose.model('Leaderboard', LeaderboardSchema);
