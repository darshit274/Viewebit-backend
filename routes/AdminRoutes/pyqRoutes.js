const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const pyqController = require('../../controllers/AdminController/pyqController');
const { adminAuth } = require('../../utils/AdminAuth');

// Validation rules for PYQ creation/update
const pyqValidationRules = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('exam_type_id')
    .isInt({ min: 1 })
    .withMessage('Valid exam type ID is required'),
  
  body('exam_year')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Valid exam year is required'),
  
  body('exam_session')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Exam session must not exceed 100 characters'),
  
  body('paper_type')
    .isIn(['prelims', 'mains', 'full', 'sectional'])
    .withMessage('Paper type must be one of: prelims, mains, full, sectional'),
  
  body('paper_number')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Paper number must be between 1 and 10'),
  
  body('total_questions')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total questions must be between 1 and 1000'),
  
  body('duration_minutes')
    .isInt({ min: 1, max: 600 })
    .withMessage('Duration must be between 1 and 600 minutes'),
  
  body('total_marks')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total marks must be between 1 and 1000'),
  
  body('negative_marking')
    .optional()
    .isBoolean()
    .withMessage('Negative marking must be a boolean'),
  
  body('negative_marks')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Negative marks must be between 0 and 10'),
  
  body('supports_multilanguage')
    .optional()
    .isBoolean()
    .withMessage('Supports multilanguage must be a boolean'),
  
  body('original_exam_date')
    .optional()
    .isISO8601()
    .withMessage('Original exam date must be a valid date'),
  
  body('conducting_authority')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Conducting authority must not exceed 255 characters'),
  
  body('instructions')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Instructions must not exceed 5000 characters'),
  
  body('exam_pattern_notes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Exam pattern notes must not exceed 2000 characters'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean'),
  
  body('is_featured')
    .optional()
    .isBoolean()
    .withMessage('Is featured must be a boolean')
];

// Apply admin authentication to all routes
router.use(adminAuth);

// GET /admin/pyqs - Get all PYQs with filtering and pagination
router.get('/', pyqController.getPYQs);

// GET /admin/pyqs/stats - Get PYQ statistics
router.get('/stats', pyqController.getPYQStats);

// GET /admin/pyqs/years - Get available exam years
router.get('/years', pyqController.getExamYears);

// GET /admin/pyqs/sessions - Get available exam sessions
router.get('/sessions', pyqController.getExamSessions);

// GET /admin/pyqs/authorities - Get conducting authorities
router.get('/authorities', pyqController.getConductingAuthorities);

// GET /admin/pyqs/:id - Get single PYQ
router.get('/:id', pyqController.getPYQById);

// POST /admin/pyqs - Create new PYQ
router.post('/', pyqValidationRules, pyqController.createPYQ);

// PUT /admin/pyqs/:id - Update PYQ
router.put('/:id', pyqValidationRules, pyqController.updatePYQ);

// DELETE /admin/pyqs/:id - Delete PYQ
router.delete('/:id', pyqController.deletePYQ);

// PATCH /admin/pyqs/:id/toggle-status - Toggle active status
router.patch('/:id/toggle-status', pyqController.toggleStatus);

// PATCH /admin/pyqs/:id/toggle-featured - Toggle featured status
router.patch('/:id/toggle-featured', pyqController.toggleFeatured);

// POST /admin/pyqs/:id/duplicate - Duplicate PYQ
router.post('/:id/duplicate', [
  body('title')
    .notEmpty()
    .withMessage('Title is required for duplicate')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Valid year is required')
], pyqController.duplicatePYQ);

// Bulk operations (for future implementation)
// router.patch('/bulk-status', pyqController.bulkUpdateStatus);
// router.delete('/bulk-delete', pyqController.bulkDelete);
// router.patch('/bulk-exam-type', pyqController.bulkUpdateExamType);

// PYQ Questions management (for future implementation)
// router.get('/:id/questions', pyqController.getPYQQuestions);
// router.post('/:id/questions', pyqController.addQuestionsToPYQ);
// router.delete('/:id/questions', pyqController.removeQuestionsFromPYQ);

// PYQ Attempts and Analytics (for future implementation)
// router.get('/:id/attempts', pyqController.getPYQAttempts);
// router.get('/:id/analytics', pyqController.getPYQAnalytics);

// Import/Export functionality (for future implementation)
// router.get('/:id/export', pyqController.exportPYQ);
// router.post('/:id/import-questions', pyqController.importPYQQuestions);

module.exports = router;