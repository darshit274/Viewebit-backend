const express = require('express');
const router = express.Router();
const quizController = require('../../controllers/QuizController');
const { authToken } = require('../../utils/AuthToken');

// All quiz routes require authentication
router.use(authToken);

// Quiz session management
router.get('/validate', quizController.validateQuizSession);
router.post('/start', quizController.startQuiz);
router.get('/session/:sessionId', quizController.getSessionStatus);
router.post('/pause-resume', quizController.pauseResumeQuiz);
router.post('/save-answer', quizController.saveAnswer);
router.post('/submit', quizController.submitQuiz);

// Quiz history and leaderboard
router.get('/history', quizController.getQuizHistory);
router.get('/leaderboard/:test_type/:test_id', quizController.getQuizLeaderboard);
router.get('/review/:sessionId/:resultId', quizController.reviewAnswers);

module.exports = router;