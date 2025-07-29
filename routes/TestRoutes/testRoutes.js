const express = require('express');
const router = express.Router();
const testController = require('../../controllers/TestController');
const { authToken } = require('../../utils/AuthToken');

// Public routes (no authentication required)
router.get('/categories', testController.getExamCategories);
router.get('/series', testController.getTestSeries);
router.get('/series/:id', testController.getTestSeriesById);

// Protected routes (authentication required)
router.use(authToken);

// Test session management
router.post('/:testId/start', testController.startTestSession);
router.post('/session/:sessionId/answer', testController.submitAnswer);
router.post('/session/:sessionId/pause', testController.pauseTestSession);
router.post('/session/:sessionId/resume', testController.resumeTestSession);
router.post('/session/:sessionId/submit', testController.submitTest);
router.get('/session/:sessionId/status', testController.getSessionStatus);

// Test navigation and utilities - TODO: Add missing methods
// router.get('/session/:sessionId/questions', testController.getSessionQuestions);
// router.post('/session/:sessionId/flag/:questionId', testController.toggleQuestionFlag);
// router.get('/session/:sessionId/review', testController.getSessionReview);

// User test history and analytics - TODO: Add missing methods
// router.get('/history', testController.getUserTestHistory);
router.get('/results/:sessionId', testController.getTestResults);
// router.get('/leaderboard/:testId', testController.getTestLeaderboard);

module.exports = router;