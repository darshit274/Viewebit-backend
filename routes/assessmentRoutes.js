const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/AssessmentController');
const { adminAuth } = require('../utils/AdminAuth');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Max 5 submissions per device per day - a genuine respondent only submits once
const submitAssessmentLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many submissions from this device. Please try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false
});

const validateSubmission = [
  body('leadInfo.first_name').trim().notEmpty().withMessage('First name is required'),
  body('leadInfo.last_name').trim().notEmpty().withMessage('Last name is required'),
  body('leadInfo.work_email').trim().notEmpty().withMessage('Work email is required')
    .isEmail().withMessage('Please provide a valid work email address').normalizeEmail(),
  body('leadInfo.agency_name').trim().notEmpty().withMessage('Agency name is required'),
  body('leadInfo.job_title').trim().notEmpty().withMessage('Job title is required'),
  body('leadInfo.employee_count_band').trim().notEmpty().withMessage('Number of employees is required'),
  body('leadInfo.phone').optional({ checkFalsy: true }).trim(),
  body('answers').isObject().withMessage('Answers are required')
];

const validateStatusUpdate = [
  body('status').notEmpty().withMessage('Status is required')
    .isIn(['new', 'contacted', 'qualified', 'unqualified', 'closed']).withMessage('Invalid status'),
  body('admin_notes').optional().isLength({ max: 5000 }).withMessage('Admin notes must not exceed 5000 characters')
];

const validateQueryParams = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isIn(['10', '20', '50']).withMessage('Limit must be 10, 20, or 50'),
  query('status').optional().isIn(['all', 'new', 'contacted', 'qualified', 'unqualified', 'closed']).withMessage('Invalid status filter'),
  query('sortBy').optional().isIn(['created_at', 'updated_at', 'overall_score']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map((err) => ({ field: err.path || err.param, message: err.msg }))
    });
  }
  next();
};

// Public routes
router.get('/questions', assessmentController.getQuestions);
router.post('/submit', submitAssessmentLimiter, validateSubmission, handleValidationErrors, assessmentController.submitAssessment);

// Admin routes
router.get('/admin/leads', adminAuth, validateQueryParams, handleValidationErrors, assessmentController.getAllLeads);
router.get('/admin/leads/stats', adminAuth, assessmentController.getStats);
router.get('/admin/leads/:id', adminAuth, assessmentController.getLeadById);
router.patch('/admin/leads/:id/status', adminAuth, validateStatusUpdate, handleValidationErrors, assessmentController.updateLeadStatus);
router.delete('/admin/leads/:id', adminAuth, assessmentController.deleteLead);

module.exports = router;
