const mongoose = require('mongoose');

const uploadedDocumentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['id_card', 'grade_card'],
        required: true,
    },
    originalName: String,
    mimeType: String,
    bytes: Number,
    fileHash: String,
    storageProvider: {
        type: String,
        enum: ['cloudinary'],
        default: 'cloudinary',
    },
    publicId: String,
    resourceType: String,
    secureUrl: String,
}, { _id: false });

const extractedIdentitySchema = new mongoose.Schema({
    fullName: { type: String, default: null },
    studentId: { type: String, default: null },
    enrollmentNumber: { type: String, default: null },
    rollNumber: { type: String, default: null },
    universityName: { type: String, default: null },
    programme: { type: String, default: null },
    session: { type: String, default: null },
    sgpa: { type: Number, default: null },
    cgpa: { type: Number, default: null },
    marks: { type: Number, default: null },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    warnings: { type: [String], default: [] },
}, { _id: false });

const verificationSubmissionSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['processing', 'accepted', 'needs_review', 'rejected'],
        default: 'processing',
    },
    documents: {
        idCard: { type: uploadedDocumentSchema, default: null },
        gradeCard: { type: uploadedDocumentSchema, default: null },
    },
    extracted: {
        idCard: { type: extractedIdentitySchema, default: () => ({}) },
        gradeCard: { type: extractedIdentitySchema, default: () => ({}) },
    },
    comparison: {
        normalizedNameMatchScore: { type: Number, min: 0, max: 1, default: 0 },
        enrollmentExactMatch: { type: Boolean, default: false },
        rollNumberExactMatch: { type: Boolean, default: false },
        universityMatch: { type: Boolean, default: false },
        acceptedBecause: { type: [String], default: [] },
        rejectedBecause: { type: [String], default: [] },
    },
    llm: {
        extractorModel: { type: String, default: null },
        reviewerModel: { type: String, default: null },
        provider: { type: String, default: 'openrouter' },
        rawDecision: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    resultingEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LeaderboardEntry',
        default: null,
    },
}, { timestamps: true });

module.exports = mongoose.model('VerificationSubmission', verificationSubmissionSchema);
