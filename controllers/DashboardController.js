const { Sequelize, Op } = require('sequelize');
const db = require('../config/database');
const {
  User,
  TestSession,
  UserAnswer,
  Subscription,
  Pdfs,
  LeaderboardEntry,
  Category, // Using Category model instead of DynamicCategory
  TestSeries
} = require('../models');

class DashboardController {
  // Get dashboard statistics for a user
  static async getDashboardStats(req, res) {
    try {
      const userUuid = req.user.uuid;

      // Get total completed test sessions
      const completedTests = await TestSession.count({
        where: {
          user_id: userUuid,
          status: 'completed'
        }
      });

      // Get total available tests (active categories)
      const totalAvailableTests = await Category.count({
        where: {
          is_active: true
        }
      });

      // Get total score from all completed tests
      const totalScoreResult = await TestSession.sum('calculated_score', {
        where: {
          user_id: userUuid,
          status: 'completed'
        }
      });
      const totalScore = totalScoreResult || 0;

      // Get user's rank from leaderboard
      const leaderboardEntry = await LeaderboardEntry.findOne({
        where: { user_id: userUuid },
        order: [['score', 'DESC']]
      });
      const rank = leaderboardEntry?.rank || null;

      // Get total users count for context
      const totalStudents = await User.count();

      // Get active subscriptions count
      const activeSubscriptions = await Subscription.count({
        where: {
          user_id: userUuid,
          status: 'completed',
          [Op.or]: [
            { expiry_date: null }, // No expiry
            { expiry_date: { [Op.gte]: new Date() } } // Not expired
          ]
        }
      });

      // Get recent test sessions with details
      const recentTestSessions = await TestSession.findAll({
        where: {
          user_id: userUuid,
          status: 'completed'
        },
        order: [['completed_at', 'DESC']],
        limit: 5,
        attributes: ['id', 'calculated_score', 'total_questions', 'total_correct', 'completed_at', 'started_at']
      });

      // Format recent activity
      const recentActivity = recentTestSessions.map((session, index) => {
        const scorePercentage = session.total_questions > 0
          ? Math.round((session.total_correct / session.total_questions) * 100)
          : 0;

        return {
          id: index + 1,
          sessionUuid: session.id,
          type: 'test',
          title: `Test ${index + 1}`,
          date: session.completed_at || session.started_at,
          score: session.total_correct || 0,
          total: session.total_questions || 0,
          percentage: scorePercentage
        };
      });

      const dashboardStats = {
        totalTests: totalAvailableTests,
        completedTests: completedTests,
        totalScore: Math.round(totalScore),
        rank: rank,
        totalStudents: totalStudents,
        activeSubscriptions: activeSubscriptions,
        recentActivity: recentActivity
      };

      res.json({
        success: true,
        message: 'Dashboard stats retrieved successfully',
        data: dashboardStats
      });

    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get user profile summary for dashboard
  static async getUserSummary(req, res) {
    try {
      // Return demo data for now
      const daysSinceJoining = Math.floor(Math.random() * 30) + 1; // 1-30 days
      
      const summary = {
        user: {
          uuid: req.user.uuid,
          username: req.user.username || 'testuser',
          email: req.user.email,
          isEmailVerified: req.user.isEmailVerified || false,
          joinedAt: new Date(Date.now() - daysSinceJoining * 24 * 60 * 60 * 1000).toISOString(),
          daysSinceJoining: daysSinceJoining
        },
        achievements: [
          { name: 'First Login', completed: true, date: new Date().toISOString() },
          { name: 'Email Verified', completed: req.user.isEmailVerified || false, date: null },
          { name: 'First Test Completed', completed: daysSinceJoining > 1, date: daysSinceJoining > 1 ? new Date().toISOString() : null },
          { name: 'Study Streak 7 Days', completed: daysSinceJoining > 7, date: daysSinceJoining > 7 ? new Date().toISOString() : null }
        ]
      };

      res.json({
        success: true,
        message: 'User summary retrieved successfully',
        data: summary
      });

    } catch (error) {
      console.error('User summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = DashboardController;