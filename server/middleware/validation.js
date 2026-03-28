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

const validateLeaderboardCreate = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
        .escape(),
    handleValidationErrors
];

const validateLeaderboardEntry = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
        .escape(),
    body('cgpa')
        .isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
    body('marks')
        .optional()
        .isFloat({ min: 0, max: 700 }).withMessage('Marks must be between 0 and 700'),
    body('leaderboardId')
        .notEmpty().withMessage('Leaderboard ID is required')
        .isMongoId().withMessage('Invalid Leaderboard ID format'),
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
    body('marks')
        .optional({ nullable: true })
        .isFloat({ min: 0, max: 700 }).withMessage('Marks must be between 0 and 700'),
    body().custom((value) => {
        const hasEditableField =
            Object.prototype.hasOwnProperty.call(value, 'name') ||
            Object.prototype.hasOwnProperty.call(value, 'cgpa') ||
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
    validateLeaderboardEntry,
    validateLeaderboardEntryEdit,
    validateReportSubmit,
    validateFeedbackSubmit,
    validateObjectId,
    validateSearchQuery,
    handleValidationErrors
};
