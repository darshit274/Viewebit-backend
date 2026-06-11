const express = require('express');
const router = express.Router();
const contactQueryController = require('../controllers/ContactQueryController');
const { adminAuth } = require('../utils/AdminAuth');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiter for contact form submissions
// Max 3 submissions per email per day
const submitQueryLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  // Use email as key if available, otherwise fall back to standard IP handling
  skip: (req) => false, // Don't skip any requests
  message: {
    success: false,
    message: 'Too many submissions from this email. Please try again tomorrow.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const validateSubmission = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Full name should only contain letters and spaces'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('mobile_number')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .isLength({ min: 10, max: 20 }).withMessage('Mobile number must be between 10 and 20 characters')
    .matches(/^[0-9+\-() ]+$/).withMessage('Please enter a valid mobile number')
    .custom((value) => {
      const digits = value.replace(/[^0-9]/g, '');
      if (digits.length === 10 || (digits.length === 12 && value.startsWith('+91'))) {
        return true;
      }
      throw new Error('Please enter a valid 10-digit Indian mobile number');
    }),

  body('query_message')
    .trim()
    .notEmpty().withMessage('Query message is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Query message must be between 10 and 5000 characters')
];

const validateStatusUpdate = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['viewed', 'solved']).withMessage('Status must be "viewed" or "solved"'),

  body('admin_notes')
    .optional()
    .isLength({ max: 5000 }).withMessage('Admin notes must not exceed 5000 characters')
];

const validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isIn(['10', '20', '50']).withMessage('Limit must be 10, 20, or 50'),

  query('status')
    .optional()
    .isIn(['all', 'pending', 'viewed', 'solved']).withMessage('Invalid status filter'),

  query('sortBy')
    .optional()
    .isIn(['created_at', 'updated_at']).withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Public Routes
router.post(
  '/submit',
  submitQueryLimiter,
  validateSubmission,
  handleValidationErrors,
  contactQueryController.submitQuery
);

// Admin Routes (require authentication)
router.get(
  '/admin/queries',
  adminAuth,
  validateQueryParams,
  handleValidationErrors,
  contactQueryController.getAllQueries
);

router.get(
  '/admin/queries/stats',
  adminAuth,
  contactQueryController.getStats
);

router.get(
  '/admin/queries/:id',
  adminAuth,
  contactQueryController.getQueryById
);

router.patch(
  '/admin/queries/:id/status',
  adminAuth,
  validateStatusUpdate,
  handleValidationErrors,
  contactQueryController.updateQueryStatus
);

router.delete(
  '/admin/queries/:id',
  adminAuth,
  contactQueryController.deleteQuery
);

module.exports = router;
