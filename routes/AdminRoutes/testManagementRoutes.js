const express = require('express');
const router = express.Router();
const testManagementController = require('../../controllers/AdminController/TestManagementController');
const { adminAuth } = require('../../utils/AdminAuth');
const { body } = require('express-validator');

// All routes require admin authentication
router.use(adminAuth);

// ============= EXAM CATEGORY MANAGEMENT =============

// Get all exam categories
router.get('/categories', testManagementController.getExamCategories);

// Create new exam category
router.post('/categories', [
  body('name').notEmpty().withMessage('Name is required'),
  body('hierarchy_level').isInt({ min: 0, max: 3 }).withMessage('Invalid hierarchy level'),
  body('parent_id').optional().isInt().withMessage('Invalid parent ID'),
  body('display_order').optional().isInt().withMessage('Invalid display order')
], testManagementController.createExamCategory);

// Update exam category
router.put('/categories/:id', testManagementController.updateExamCategory);

// Delete exam category
router.delete('/categories/:id', testManagementController.deleteExamCategory);

// ============= TEST SERIES MANAGEMENT =============

// Get all test series
router.get('/series', testManagementController.getTestSeries);

// Get single test series
router.get('/series/:id', testManagementController.getTestSeriesById);

// Create new test series
router.post('/series', [
  body('title').notEmpty().withMessage('Title is required'),
  body('category_id').isInt().withMessage('Category ID is required'),
  body('price').isDecimal({ decimal_digits: '0,2' }).withMessage('Invalid price format'),
  body('difficulty_level').isIn(['beginner', 'intermediate', 'advanced', 'expert', 'mixed']).withMessage('Invalid difficulty level'),
  body('supports_pause_resume').optional().isBoolean().withMessage('Invalid pause/resume setting'),
  body('supports_multilanguage').optional().isBoolean().withMessage('Invalid multilanguage setting'),
  body('has_negative_marking').optional().isBoolean().withMessage('Invalid negative marking setting')
], testManagementController.createTestSeries);

// Update test series
router.put('/series/:id', testManagementController.updateTestSeries);

// Delete test series
router.delete('/series/:id', testManagementController.deleteTestSeries);

// Toggle publish status
router.patch('/series/:id/publish', [
  body('is_published').isBoolean().withMessage('Published status must be boolean')
], testManagementController.togglePublishStatus);

// Toggle featured status
router.patch('/series/:id/featured', testManagementController.toggleFeaturedStatus);

// ============= TEST MANAGEMENT =============

// Get tests for a series
router.get('/series/:seriesId/tests', testManagementController.getTestsForSeries);

// Create new test
router.post('/series/:seriesId/tests', [
  body('title').notEmpty().withMessage('Title is required'),
  body('duration_minutes').isInt({ min: 1 }).withMessage('Valid duration is required'),
  body('test_type').isIn(['practice', 'mock', 'assessment', 'sample', 'full_length']).withMessage('Invalid test type'),
  body('is_free').optional().isBoolean().withMessage('Invalid free status'),
  body('is_one_time').optional().isBoolean().withMessage('Invalid one-time status'),
  body('allows_pause').optional().isBoolean().withMessage('Invalid pause setting'),
  body('has_negative_marking').optional().isBoolean().withMessage('Invalid negative marking setting')
], testManagementController.createTest);

// Update test
router.put('/tests/:testId', testManagementController.updateTest);

// Delete test
router.delete('/tests/:testId', testManagementController.deleteTest);

// ============= QUESTION MANAGEMENT =============

// Get questions for a test
router.get('/tests/:testId/questions', testManagementController.getQuestionsForTest);

// Create new question
router.post('/tests/:testId/questions', [
  body('question').notEmpty().withMessage('Question text is required'),
  body('options').isArray({ min: 2 }).withMessage('At least 2 options are required'),
  body('correct_option').isIn(['A', 'B', 'C', 'D']).withMessage('Valid correct option is required'),
  body('marks').optional().isInt({ min: 1 }).withMessage('Invalid marks value'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard', 'expert']).withMessage('Invalid difficulty level')
], testManagementController.createQuestion);

// Bulk create questions
router.post('/tests/:testId/questions/bulk', testManagementController.bulkCreateQuestions);

// Update question
router.put('/questions/:questionId', testManagementController.updateQuestion);

// Delete question
router.delete('/questions/:questionId', testManagementController.deleteQuestion);

// ============= ANALYTICS AND REPORTS =============

// Get test series analytics
router.get('/series/:seriesId/analytics', testManagementController.getTestSeriesAnalytics);

// Get test analytics
router.get('/tests/:testId/analytics', testManagementController.getTestAnalytics);

// Get question analytics
router.get('/questions/:questionId/analytics', testManagementController.getQuestionAnalytics);

// Get user sessions for a test
router.get('/tests/:testId/sessions', testManagementController.getTestSessions);

// Get detailed session data
router.get('/sessions/:sessionId', testManagementController.getSessionDetails);

// ============= SUBSCRIPTION MANAGEMENT =============

// Get subscriptions for a test series
router.get('/series/:seriesId/subscriptions', testManagementController.getSeriesSubscriptions);

// Create manual subscription
router.post('/subscriptions', [
  body('user_id').isUUID().withMessage('Valid user ID is required'),
  body('test_series_id').isInt().withMessage('Valid test series ID is required'),
  body('subscription_type').isIn(['free', 'paid', 'premium', 'trial', 'gifted']).withMessage('Invalid subscription type'),
  body('expires_at').optional().isISO8601().withMessage('Invalid expiration date')
], testManagementController.createManualSubscription);

// Update subscription
router.put('/subscriptions/:subscriptionId', testManagementController.updateSubscription);

// Cancel subscription
router.delete('/subscriptions/:subscriptionId', testManagementController.cancelSubscription);

module.exports = router;