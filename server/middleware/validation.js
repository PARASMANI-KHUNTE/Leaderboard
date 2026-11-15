const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Validation failed', 
            errors: errors.array().map(e => e.msg) 
        });
    }
    next();
};

const boardFieldsValidator = body('fields')
    .optional()
    .custom((value) => {
        if (typeof value !== 'object' || value === null) {
            throw new Error('Fields must be an object');
        }
        return true;
    });

const boardRankingValidator = body('ranking')
    .optional()
    .custom((value) => {
        if (typeof value !== 'object' || value === null) {
            throw new Error('Ranking must be an object');
        }
        return true;
    });

const boardVerificationValidator = body('verification')
    .optional()
    .custom((value) => {
        if (typeof value !== 'object' || value === null) {
            throw new Error('Verification must be an object');
        }
        return true;
    });

const validateLeaderboardCreate = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
        .escape(),
    body('entryMode')
        .optional()
        .isIn(['manual', 'upload', 'hybrid']).withMessage('Invalid entry mode'),
    boardFieldsValidator,
    boardRankingValidator,
    boardVerificationValidator,
    handleValidationErrors
];

const validateLeaderboardSettings = [
    body('name')
        .optional()
        .trim()
        .notEmpty().withMessage('Name cannot be empty')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
        .escape(),
    body('entryMode')
        .optional()
        .isIn(['manual', 'upload', 'hybrid']).withMessage('Invalid entry mode'),
    boardFieldsValidator,
    boardRankingValidator,
    boardVerificationValidator,
    body().custom((value) => {
        const editableKeys = ['name', 'entryMode', 'fields', 'ranking', 'verification'];
        const hasAnyEditableKey = editableKeys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
        if (!hasAnyEditableKey) {
            throw new Error('At least one leaderboard setting is required');
        }
        return true;
    }),
    handleValidationErrors,
];

const validateLeaderboardEntry = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
        .escape(),
    body('cgpa')
        .optional({ nullable: true })
        .isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
    body('sgpa')
        .optional({ nullable: true })
        .isFloat({ min: 0, max: 10 }).withMessage('SGPA must be between 0 and 10'),
    body('marks')
        .optional({ nullable: true })
        .isFloat({ min: 0, max: 700 }).withMessage('Marks must be between 0 and 700'),
    body('leaderboardId')
        .notEmpty().withMessage('Leaderboard ID is required')
        .isMongoId().withMessage('Invalid Leaderboard ID format'),
    body().custom((value) => {
        const hasAnyMetric =
            value.cgpa !== undefined ||
            value.sgpa !== undefined ||
            value.marks !== undefined;
        if (!hasAnyMetric) {
            throw new Error('At least one ranking field is required');
        }
        return true;
    }),
    handleValidationErrors
];

const validateLeaderboardEntryEdit = [
    body('name')
        .optional()
        .trim()
        .notEmpty().withMessage('Name cannot be empty')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
        .escape(),
    body('cgpa')
        .optional()
        .isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
    body('sgpa')
        .optional()
        .isFloat({ min: 0, max: 10 }).withMessage('SGPA must be between 0 and 10'),
    body('marks')
        .optional({ nullable: true })
        .isFloat({ min: 0, max: 700 }).withMessage('Marks must be between 0 and 700'),
    body().custom((value) => {
        const hasEditableField =
            Object.prototype.hasOwnProperty.call(value, 'name') ||
            Object.prototype.hasOwnProperty.call(value, 'cgpa') ||
            Object.prototype.hasOwnProperty.call(value, 'sgpa') ||
            Object.prototype.hasOwnProperty.call(value, 'marks');
        if (!hasEditableField) {
            throw new Error('At least one editable field is required');
        }
        return true;
    }),
    handleValidationErrors
];

const validateReportSubmit = [
    body('entryId')
        .notEmpty().withMessage('Entry ID is required')
        .isMongoId().withMessage('Invalid Entry ID format'),
    body('reason')
        .trim()
        .notEmpty().withMessage('Reason is required')
        .isLength({ min: 1, max: 200 }).withMessage('Reason must be 1-200 characters'),
    handleValidationErrors
];

const validateFeedbackSubmit = [
    body('text')
        .trim()
        .notEmpty().withMessage('Feedback text is required')
        .isLength({ min: 1, max: 2000 }).withMessage('Feedback must be 1-2000 characters'),
    handleValidationErrors
];

const validateObjectId = (paramName = 'id') => [
    param(paramName)
        .isMongoId().withMessage(`Invalid ${paramName} format`),
    handleValidationErrors
];

const validateSearchQuery = [
    query('search')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Search query too long')
        .escape(),
    handleValidationErrors
];

module.exports = {
    validateLeaderboardCreate,
    validateLeaderboardSettings,
    validateLeaderboardEntry,
    validateLeaderboardEntryEdit,
    validateReportSubmit,
    validateFeedbackSubmit,
    validateObjectId,
    validateSearchQuery,
    handleValidationErrors
};
