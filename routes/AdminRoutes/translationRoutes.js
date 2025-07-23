const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const translationController = require('../../controllers/AdminController/translationController');
const {adminAuth} = require('../../utils/AdminAuth');

// Validation rules for translation creation/update
const translationValidationRules = [
  body('question_id')
    .isInt({ min: 1 })
    .withMessage('Valid question ID is required'),
  
  body('language_code')
    .notEmpty()
    .withMessage('Language code is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Language code must be between 2 and 10 characters'),
  
  body('language_name')
    .notEmpty()
    .withMessage('Language name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Language name must be between 2 and 50 characters'),
  
  body('question_text')
    .notEmpty()
    .withMessage('Question text is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Question text must be between 10 and 5000 characters'),
  
  body('option_a')
    .notEmpty()
    .withMessage('Option A is required')
    .isLength({ max: 1000 })
    .withMessage('Option A must not exceed 1000 characters'),
  
  body('option_b')
    .notEmpty()
    .withMessage('Option B is required')
    .isLength({ max: 1000 })
    .withMessage('Option B must not exceed 1000 characters'),
  
  body('option_c')
    .notEmpty()
    .withMessage('Option C is required')
    .isLength({ max: 1000 })
    .withMessage('Option C must not exceed 1000 characters'),
  
  body('option_d')
    .notEmpty()
    .withMessage('Option D is required')
    .isLength({ max: 1000 })
    .withMessage('Option D must not exceed 1000 characters'),
  
  body('explanation')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Explanation must not exceed 2000 characters'),
  
  body('translation_status')
    .optional()
    .isIn(['draft', 'review', 'approved', 'published'])
    .withMessage('Translation status must be one of: draft, review, approved, published'),
  
  body('quality_score')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Quality score must be between 1 and 10')
];

// Apply admin authentication to all routes
router.use(adminAuth);

// GET /admin/translations - Get all translations with filtering and pagination
router.get('/', translationController.getTranslations);

// GET /admin/translations/stats - Get translation statistics
router.get('/stats', translationController.getTranslationStats);

// GET /admin/translations/languages - Get available languages
router.get('/languages', translationController.getAvailableLanguages);

// GET /admin/translations/questions-needing-translation - Get questions that need translation
router.get('/questions-needing-translation', translationController.getQuestionsNeedingTranslation);

// GET /admin/translations/:id - Get single translation
router.get('/:id', translationController.getTranslationById);

// POST /admin/translations - Create new translation
router.post('/', translationValidationRules, translationController.createTranslation);

// PUT /admin/translations/:id - Update translation
router.put('/:id', translationValidationRules, translationController.updateTranslation);

// DELETE /admin/translations/:id - Delete translation
router.delete('/:id', translationController.deleteTranslation);

// PATCH /admin/translations/:id/status - Update translation status
router.patch('/:id/status', [
  body('status')
    .isIn(['draft', 'review', 'approved', 'published'])
    .withMessage('Status must be one of: draft, review, approved, published'),
  body('quality_score')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Quality score must be between 1 and 10')
], translationController.updateTranslationStatus);

// PATCH /admin/translations/bulk-status - Bulk update translation status
router.patch('/bulk-status', [
  body('translation_ids')
    .isArray({ min: 1 })
    .withMessage('Translation IDs array is required'),
  body('translation_ids.*')
    .isInt({ min: 1 })
    .withMessage('Each translation ID must be a valid integer'),
  body('status')
    .isIn(['draft', 'review', 'approved', 'published'])
    .withMessage('Status must be one of: draft, review, approved, published'),
  body('quality_score')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Quality score must be between 1 and 10')
], translationController.bulkUpdateStatus);

module.exports = router;