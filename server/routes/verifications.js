const express = require('express');
const multer = require('multer');
const Leaderboard = require('../models/LeaderboardCollection');
const LeaderboardEntry = require('../models/Leaderboard');
const VerificationSubmission = require('../models/VerificationSubmission');
const { auth } = require('../middleware/auth');
const { compareDocuments } = require('../utils/verification');
const { buildEntryRankingPayload } = require('../utils/ranking');
const {
    compressUpload,
    uploadToCloudinary,
    extractDocumentData,
    reviewVerification,
    sha256,
} = require('../services/documentVerification');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 2,
        fileSize: 8 * 1024 * 1024,
    },
});

function buildFilename(type, userId) {
    return `${type}_${userId}_${Date.now()}`;
}

function mergeComparisonWithReview(comparison, llmReviewResult) {
    if (!llmReviewResult) return comparison;

    const suggestedDecision = String(llmReviewResult.suggestedDecision || '').toLowerCase();
    const llmConfidence = Number(llmReviewResult.confidence || 0);
    const reasons = Array.isArray(llmReviewResult.reasons) ? llmReviewResult.reasons : [];

    const merged = {
        ...comparison,
        acceptedBecause: [...new Set([...(comparison.acceptedBecause || []), ...reasons.filter(Boolean)])],
        llm: {
            suggestedDecision,
            confidence: llmConfidence,
        },
    };

    const coreNameMatched = comparison?.fields?.name?.status === 'matched';
    const coreUniversityMatched = comparison?.fields?.university?.status === 'matched';

    if (
        suggestedDecision === 'accepted' &&
        llmConfidence >= 0.7 &&
        coreNameMatched &&
        coreUniversityMatched &&
        comparison.status !== 'accepted'
    ) {
        merged.status = 'accepted';
        merged.acceptedBecause = [...new Set([
            ...(merged.acceptedBecause || []),
            'LLM review accepted the match after considering university/program aliases.',
        ])];
    } else if (
        suggestedDecision === 'needs_review' &&
        comparison.status === 'rejected' &&
        coreNameMatched
    ) {
        merged.status = 'needs_review';
    }

    return merged;
}

function getLeaderboardVerificationError(leaderboard, { idCardFile, gradeCardFile }) {
    if (!leaderboard.isLive) return 'This leaderboard is currently closed for submissions';
    if (leaderboard.entryMode === 'manual') return 'This board only accepts manual submissions';
    if (leaderboard.verification.requireIdCard && !idCardFile) return 'ID card is required for this board';
    if (leaderboard.verification.requireGradeCard && !gradeCardFile) return 'Grade card is required for this board';
    return null;
}

async function extractSingleDocument(file, documentType) {
    if (!file) {
        return {
            parsed: {
                fullName: null,
                studentId: null,
                enrollmentNumber: null,
                rollNumber: null,
                universityName: null,
                programme: null,
                session: null,
                sgpa: null,
                cgpa: null,
                marks: null,
                confidence: 0,
                warnings: ['No document uploaded.'],
            },
            model: null,
        };
    }

    const extracted = await extractDocumentData({
        buffer: file.buffer,
        mimeType: file.mimetype,
        documentType,
    });
    const compressed = await compressUpload(file);

    return {
        original: {
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalName: file.originalname,
            bytes: file.size,
            compressed: false,
        },
        compressed,
        extracted,
    };
}

router.post('/extract-id-card', auth, upload.single('idCard'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'ID card file is required' });
        }

        const { compressed, extracted } = await extractSingleDocument(req.file, 'id_card');
        res.json({
            documentType: 'id_card',
            extracted: extracted.parsed,
            model: extracted.model,
            file: {
                originalName: req.file.originalname,
                mimeType: compressed.mimeType,
                bytes: compressed.bytes,
            },
        });
    } catch (err) {
        console.error('[verification extract-id-card] failed', err);
        res.status(500).json({ message: err.message || 'Failed to extract ID card' });
    }
});

router.post('/extract-grade-card', auth, upload.single('gradeCard'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Grade card file is required' });
        }

        const { compressed, extracted } = await extractSingleDocument(req.file, 'grade_card');
        res.json({
            documentType: 'grade_card',
            extracted: extracted.parsed,
            model: extracted.model,
            file: {
                originalName: req.file.originalname,
                mimeType: compressed.mimeType,
                bytes: compressed.bytes,
            },
        });
    } catch (err) {
        console.error('[verification extract-grade-card] failed', err);
        res.status(500).json({ message: err.message || 'Failed to extract grade card' });
    }
});

router.post('/compare', auth, async (req, res) => {
    try {
        const { idCard, gradeCard } = req.body || {};
        if (!idCard || !gradeCard) {
            return res.status(400).json({ message: 'Both extracted ID card and grade card data are required' });
        }

        const comparison = compareDocuments(idCard, gradeCard);
        const llmReview = await reviewVerification({
            leaderboard: {
                entryMode: 'upload',
                verification: {},
                fields: {},
            },
            idCard,
            gradeCard,
            comparison,
        });

        const finalComparison = mergeComparisonWithReview(comparison, llmReview.result);

        res.json({
            comparison: finalComparison,
            llm: {
                reviewerModel: llmReview.model,
                rawDecision: llmReview.result,
            },
        });
    } catch (err) {
        console.error('[verification compare] failed', err);
        res.status(500).json({ message: err.message || 'Failed to compare extracted documents' });
    }
});

router.post(
    '/submit-final',
    auth,
    upload.fields([
        { name: 'idCard', maxCount: 1 },
        { name: 'gradeCard', maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const { leaderboardId } = req.body;
            const idCardFile = req.files?.idCard?.[0];
            const gradeCardFile = req.files?.gradeCard?.[0];

            if (!leaderboardId) {
                return res.status(400).json({ message: 'Leaderboard ID is required' });
            }

            const leaderboard = await Leaderboard.findById(leaderboardId);
            if (!leaderboard) {
                return res.status(404).json({ message: 'Leaderboard not found' });
            }

            const leaderboardError = getLeaderboardVerificationError(leaderboard, { idCardFile, gradeCardFile });
            if (leaderboardError) {
                return res.status(400).json({ message: leaderboardError });
            }

            const existingEntry = await LeaderboardEntry.findOne({
                userId: req.user._id,
                leaderboardId,
            });
            if (existingEntry) {
                return res.status(400).json({ message: 'You have already made an entry in this leaderboard' });
            }

            const [{ compressed: compressedIdCard, extracted: idCardExtraction }, { compressed: compressedGradeCard, extracted: gradeCardExtraction }] = await Promise.all([
                extractSingleDocument(idCardFile, 'id_card'),
                extractSingleDocument(gradeCardFile, 'grade_card'),
            ]);

            const comparison = compareDocuments(idCardExtraction.parsed, gradeCardExtraction.parsed);
            const llmReview = await reviewVerification({
                leaderboard,
                idCard: idCardExtraction.parsed,
                gradeCard: gradeCardExtraction.parsed,
                comparison,
            });
            const finalComparison = mergeComparisonWithReview(comparison, llmReview.result);

            if (finalComparison.status !== 'accepted') {
                return res.status(200).json({
                    submission: {
                        leaderboardId,
                        userId: req.user._id,
                        status: comparison.status,
                        extracted: {
                            idCard: idCardExtraction.parsed,
                            gradeCard: gradeCardExtraction.parsed,
                        },
                        comparison: finalComparison,
                        llm: {
                            extractorModel: idCardExtraction.model || gradeCardExtraction.model,
                            reviewerModel: llmReview.model,
                            rawDecision: llmReview.result,
                        },
                    },
                    entry: null,
                    uploaded: false,
                });
            }

            const [uploadedIdCard, uploadedGradeCard] = await Promise.all([
                uploadToCloudinary({
                    buffer: compressedIdCard.buffer,
                    mimeType: compressedIdCard.mimeType,
                    folder: 'eliteboards/id-cards',
                    filename: buildFilename('id_card', req.user._id),
                }),
                uploadToCloudinary({
                    buffer: compressedGradeCard.buffer,
                    mimeType: compressedGradeCard.mimeType,
                    folder: 'eliteboards/grade-cards',
                    filename: buildFilename('grade_card', req.user._id),
                }),
            ]);

            const submission = await VerificationSubmission.create({
                leaderboardId,
                userId: req.user._id,
                status: finalComparison.status,
                documents: {
                    idCard: {
                        type: 'id_card',
                        originalName: idCardFile.originalname,
                        mimeType: compressedIdCard.mimeType,
                        bytes: compressedIdCard.bytes,
                        fileHash: sha256(compressedIdCard.buffer),
                        publicId: uploadedIdCard.publicId,
                        resourceType: uploadedIdCard.resourceType,
                        secureUrl: uploadedIdCard.secureUrl,
                    },
                    gradeCard: {
                        type: 'grade_card',
                        originalName: gradeCardFile.originalname,
                        mimeType: compressedGradeCard.mimeType,
                        bytes: compressedGradeCard.bytes,
                        fileHash: sha256(compressedGradeCard.buffer),
                        publicId: uploadedGradeCard.publicId,
                        resourceType: uploadedGradeCard.resourceType,
                        secureUrl: uploadedGradeCard.secureUrl,
                    },
                },
                extracted: {
                    idCard: idCardExtraction.parsed,
                    gradeCard: gradeCardExtraction.parsed,
                },
                comparison: finalComparison,
                llm: {
                    extractorModel: idCardExtraction.model || gradeCardExtraction.model,
                    reviewerModel: llmReview.model,
                    rawDecision: llmReview.result,
                },
            });

            const rankingPayload = buildEntryRankingPayload(leaderboard, {
                cgpa: gradeCardExtraction.parsed.cgpa,
                sgpa: gradeCardExtraction.parsed.sgpa,
                marks: gradeCardExtraction.parsed.marks,
            });

            const entry = await LeaderboardEntry.create({
                leaderboardId,
                userId: req.user._id,
                name: gradeCardExtraction.parsed.fullName || req.user.displayName,
                cgpa: gradeCardExtraction.parsed.cgpa,
                sgpa: gradeCardExtraction.parsed.sgpa,
                marks: gradeCardExtraction.parsed.marks,
                userPicture: req.user.profilePicture,
                verificationStatus: 'verified',
                verificationSubmissionId: submission._id,
                ...rankingPayload,
            });

            submission.resultingEntryId = entry._id;
            await submission.save();

            const { getRedisClient, bumpVersion } = require('../config/redis');
            const redisClient = await getRedisClient();
            if (redisClient) await bumpVersion(redisClient, `lb:${leaderboardId}:version`);

            const io = req.app.get('socketio');
            io.to(`leaderboard:${leaderboardId}`).emit('leaderboardChanged', { leaderboardId });

            res.status(201).json({
                submission,
                entry,
                uploaded: true,
            });
        } catch (err) {
            console.error('[verification submit-final] failed', err);
            const statusCode = err?.http_code || err?.statusCode || err?.status || 500;
            const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
            res.status(safeStatus).json({ message: err.message || 'Verification submission failed' });
        }
    }
);

router.get('/mine/:leaderboardId', auth, async (req, res) => {
    try {
        const submissions = await VerificationSubmission.find({
            userId: req.user._id,
            leaderboardId: req.params.leaderboardId,
        }).sort({ createdAt: -1 });

        res.json(submissions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
