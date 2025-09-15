const { Sequelize, Op } = require('sequelize');
const db = require('../config/database');
const { User } = require('../models');

class DashboardController {
  // Get dashboard statistics for a user
  static async getDashboardStats(req, res) {
    try {
      // For now, just return demo data without database queries
      const dashboardStats = {
        totalTests: 25,
        completedTests: Math.floor(Math.random() * 15) + 5, // 5-20 random
        totalPdfs: 40,
        downloadedPdfs: Math.floor(Math.random() * 20) + 8, // 8-28 random
        rank: Math.floor(Math.random() * 100) + 10, // 10-110 random
        totalStudents: 1547,
        recentActivity: [
          {
            id: 1,
            type: 'test',
            title: 'Mathematics Practice Test - Set A',
            date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            score: Math.floor(Math.random() * 30) + 70 // 70-100 random score
          },
          {
            id: 2,
            type: 'pdf',
            title: 'Physics Formula Reference Guide',
            date: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 3,
            type: 'test',
            title: 'Chemistry Mock Test - Organic',
            date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
            score: Math.floor(Math.random() * 25) + 75 // 75-100 random score
          },
          {
            id: 4,
            type: 'pdf',
            title: 'Previous Year Question Papers',
            date: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
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
        message: 'Internal server error'
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