const express = require('express');
const router = express.Router();
const QuestionReportController = require('../controllers/QuestionReportController');
const authenticateToken = require('../middleware/authMiddleware');
const { adminAuth } = require('../utils/AdminAuth');

// =====================
// USER ROUTES
// =====================

/**
 * @route   POST /api/questions/:questionId/report
 * @desc    Submit a report for a question
 * @access  Private (authenticated users)
 */
router.post(
  '/questions/:questionId/report',
  authenticateToken,
  QuestionReportController.submitReport
);

// =====================
// ADMIN ROUTES
// =====================

/**
 * @route   GET /api/admin/reports/pending-count
 * @desc    Get count of pending reports
 * @access  Private (admin only)
 */
router.get(
  '/admin/reports/pending-count',
  adminAuth,
  QuestionReportController.getPendingCount
);

/**
 * @route   GET /api/admin/reports
 * @desc    Get all reports grouped by question (Dashboard view)
 * @access  Private (admin only)
 */
router.get(
  '/admin/reports',
  adminAuth,
  QuestionReportController.getReportsDashboard
);

/**
 * @route   GET /api/admin/reports/question/:questionId
 * @desc    Get all reports for a specific question (Details view)
 * @access  Private (admin only)
 */
router.get(
  '/admin/reports/question/:questionId',
  adminAuth,
  QuestionReportController.getQuestionReports
);

/**
 * @route   PATCH /api/admin/reports/:reportId/status
 * @desc    Update status of a single report
 * @access  Private (admin only)
 */
router.patch(
  '/admin/reports/:reportId/status',
  adminAuth,
  QuestionReportController.updateReportStatus
);

/**
 * @route   PATCH /api/admin/reports/question/:questionId/bulk-action
 * @desc    Bulk update all reports for a question
 * @access  Private (admin only)
 */
router.patch(
  '/admin/reports/question/:questionId/bulk-action',
  adminAuth,
  QuestionReportController.bulkUpdateReports
);

module.exports = router;
