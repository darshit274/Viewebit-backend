const express = require('express');
const router = express.Router();
const TestResponseController = require('../controllers/TestResponseController');
const verifyToken = require('../middleware/authMiddleware');

// =====================
// TEST SESSION MANAGEMENT ROUTES
// =====================

// Start a new test session
router.post('/session/start', verifyToken, TestResponseController.startTestSession);

// Save answer for a question
router.post('/session/answer', verifyToken, TestResponseController.saveAnswer);

// Submit test and calculate final score
router.post('/session/submit', verifyToken, TestResponseController.submitTest);

// Get test results for a specific session
router.get('/session/:sessionId/results', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const results = await TestResponseController.getTestResults(sessionId);
    
    if (!results) {
      return res.status(404).json({
        success: false,
        message: 'Test results not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Test results retrieved successfully',
      data: results
    });
  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =====================
// LEADERBOARD ROUTES
// =====================

// Get leaderboard for a specific test
router.get('/leaderboard/test/:test_id', TestResponseController.getTestLeaderboard);

// Get leaderboard for a test series
router.get('/leaderboard/series/:test_series_id', TestResponseController.getTestSeriesLeaderboard);

// Get user's test history and performance
router.get('/history/user/:user_id', verifyToken, TestResponseController.getUserTestHistory);

// Get overall leaderboard (top performers across all tests)
router.get('/leaderboard/overall', async (req, res) => {
  try {
    const { page = 1, limit = 50, timeframe = 'all' } = req.query;
    const offset = (page - 1) * limit;

    // Build time filter
    let timeFilter = {};
    const now = new Date();
    
    switch(timeframe) {
      case 'today':
        timeFilter.completion_date = {
          [Op.gte]: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        };
        break;
      case 'week':
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        timeFilter.completion_date = {
          [Op.gte]: weekAgo
        };
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        timeFilter.completion_date = {
          [Op.gte]: monthAgo
        };
        break;
    }

    const { LeaderboardEntry, User, sequelize } = require('../models');
    const { Op } = require('sequelize');

    // Get top performers based on average score and total tests
    const leaderboard = await sequelize.query(`
      SELECT 
        le.user_id,
        u.username,
        u.fullName,
        u.avatarUrl,
        COUNT(*) as total_tests,
        AVG(le.score) as avg_score,
        AVG(le.percentage) as avg_percentage,
        SUM(le.score) as total_score,
        AVG(le.percentile) as avg_percentile,
        MAX(le.completion_date) as last_test_date
      FROM leaderboard_entries le
      JOIN users u ON le.user_id = u.uuid
      WHERE le.is_valid = 1 ${timeframe !== 'all' ? 'AND le.completion_date >= :timeFilter' : ''}
      GROUP BY le.user_id, u.username, u.fullName, u.avatarUrl
      HAVING COUNT(*) >= 1
      ORDER BY avg_score DESC, total_tests DESC, avg_percentile DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { 
        limit: parseInt(limit), 
        offset: parseInt(offset),
        ...(timeframe !== 'all' && { timeFilter: timeFilter.completion_date[Op.gte] })
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Add ranks
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: offset + index + 1,
      avg_score: Math.round(entry.avg_score * 100) / 100,
      avg_percentage: Math.round(entry.avg_percentage * 100) / 100,
      avg_percentile: Math.round(entry.avg_percentile * 100) / 100
    }));

    res.status(200).json({
      success: true,
      message: 'Overall leaderboard retrieved successfully',
      data: {
        leaderboard: rankedLeaderboard,
        timeframe,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get overall leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get category-wise leaderboard
router.get('/leaderboard/category/:category_id', async (req, res) => {
  try {
    const { category_id } = req.params;
    const { page = 1, limit = 50, user_id } = req.query;
    const offset = (page - 1) * limit;

    const { LeaderboardEntry, User, Category, sequelize } = require('../models');

    // Get category-specific leaderboard
    const leaderboard = await sequelize.query(`
      SELECT 
        le.user_id,
        u.username,
        u.fullName,
        u.avatarUrl,
        COUNT(*) as tests_taken,
        AVG(le.score) as avg_score,
        AVG(le.percentage) as avg_percentage,
        SUM(le.score) as total_score,
        AVG(le.percentile) as avg_percentile,
        MAX(le.completion_date) as last_test_date
      FROM leaderboard_entries le
      JOIN users u ON le.user_id = u.uuid
      WHERE le.category_id = :categoryId AND le.is_valid = 1
      GROUP BY le.user_id, u.username, u.fullName, u.avatarUrl
      ORDER BY total_score DESC, avg_score DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { 
        categoryId: category_id,
        limit: parseInt(limit), 
        offset: parseInt(offset)
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Get category details
    const category = await Category.findByPk(category_id, {
      attributes: ['id', 'name', 'description']
    });

    // Add ranks
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: offset + index + 1,
      avg_score: Math.round(entry.avg_score * 100) / 100,
      avg_percentage: Math.round(entry.avg_percentage * 100) / 100,
      avg_percentile: Math.round(entry.avg_percentile * 100) / 100
    }));

    res.status(200).json({
      success: true,
      message: 'Category leaderboard retrieved successfully',
      data: {
        category,
        leaderboard: rankedLeaderboard,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get category leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =====================
// ANALYTICS ROUTES
// =====================

// Get test analytics for admin
router.get('/analytics/test/:test_id', verifyToken, async (req, res) => {
  try {
    const { test_id } = req.params;
    const { LeaderboardEntry, Test, sequelize } = require('../models');

    // Get test details
    const test = await Test.findByPk(test_id, {
      attributes: ['id', 'name', 'duration_minutes']
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Get analytics data
    const analytics = await LeaderboardEntry.findOne({
      where: { test_id, is_valid: true },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_attempts'],
        [sequelize.fn('AVG', sequelize.col('score')), 'avg_score'],
        [sequelize.fn('AVG', sequelize.col('percentage')), 'avg_percentage'],
        [sequelize.fn('MAX', sequelize.col('score')), 'highest_score'],
        [sequelize.fn('MIN', sequelize.col('score')), 'lowest_score'],
        [sequelize.fn('AVG', sequelize.col('time_taken_seconds')), 'avg_time_taken'],
        [sequelize.fn('AVG', sequelize.col('correct_answers')), 'avg_correct'],
        [sequelize.fn('AVG', sequelize.col('wrong_answers')), 'avg_wrong'],
        [sequelize.fn('AVG', sequelize.col('unanswered')), 'avg_unanswered']
      ],
      raw: true
    });

    // Get score distribution
    const scoreDistribution = await sequelize.query(`
      SELECT 
        CASE 
          WHEN percentage >= 90 THEN '90-100%'
          WHEN percentage >= 80 THEN '80-89%'
          WHEN percentage >= 70 THEN '70-79%'
          WHEN percentage >= 60 THEN '60-69%'
          WHEN percentage >= 50 THEN '50-59%'
          WHEN percentage >= 40 THEN '40-49%'
          WHEN percentage >= 30 THEN '30-39%'
          ELSE '0-29%'
        END as score_range,
        COUNT(*) as count
      FROM leaderboard_entries
      WHERE test_id = :testId AND is_valid = 1
      GROUP BY score_range
      ORDER BY score_range DESC
    `, {
      replacements: { testId: test_id },
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      message: 'Test analytics retrieved successfully',
      data: {
        test,
        analytics: {
          total_attempts: analytics?.total_attempts || 0,
          avg_score: Math.round((analytics?.avg_score || 0) * 100) / 100,
          avg_percentage: Math.round((analytics?.avg_percentage || 0) * 100) / 100,
          highest_score: analytics?.highest_score || 0,
          lowest_score: analytics?.lowest_score || 0,
          avg_time_taken_minutes: Math.round((analytics?.avg_time_taken || 0) / 60),
          avg_correct: Math.round(analytics?.avg_correct || 0),
          avg_wrong: Math.round(analytics?.avg_wrong || 0),
          avg_unanswered: Math.round(analytics?.avg_unanswered || 0)
        },
        score_distribution: scoreDistribution
      }
    });

  } catch (error) {
    console.error('Get test analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;