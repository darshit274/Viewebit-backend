'use strict';

const { QuestionReport, Question, User, Test, Category, SubCategory, TestSeries } = require('../models');
const { Op } = require('sequelize');

class QuestionReportController {
  // =====================
  // USER ENDPOINTS
  // =====================

  /**
   * Submit a new question report
   * POST /api/questions/:questionId/report
   */
  async submitReport(req, res) {
    try {
      const { questionId } = req.params;
      const { reportType, reportText, userSelectedAnswer } = req.body;
      const userId = req.user.id; // From JWT middleware

      // Validation
      if (!['wrong_question', 'wrong_solution', 'other'].includes(reportType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report type. Must be one of: wrong_question, wrong_solution, other'
        });
      }

      if (reportType === 'other' && (!reportText || reportText.trim() === '')) {
        return res.status(400).json({
          success: false,
          message: 'Report text is required for "other" type',
          errors: [{
            field: 'reportText',
            message: 'Report text is required for "other" type'
          }]
        });
      }

      if (reportText && reportText.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Report text cannot exceed 500 characters',
          errors: [{
            field: 'reportText',
            message: 'Report text cannot exceed 500 characters'
          }]
        });
      }

      // Check if question exists
      const question = await Question.findOne({
        where: { id: parseInt(questionId) }
      });

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      // Rate limiting check: 5 reports per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentReportsCount = await QuestionReport.count({
        where: {
          user_id: userId,
          created_at: {
            [Op.gte]: oneHourAgo
          }
        }
      });

      if (recentReportsCount >= 5) {
        return res.status(429).json({
          success: false,
          message: 'You can only submit 5 reports per hour. Please try again later.'
        });
      }

      // Create the report
      const report = await QuestionReport.create({
        question_id: parseInt(questionId),
        user_id: userId,
        report_type: reportType,
        report_text: reportText ? reportText.trim() : null,
        user_selected_answer: userSelectedAnswer || null,
        status: 'pending'
      });

      res.status(201).json({
        success: true,
        message: 'Thank you for your feedback. Our team will review it shortly.',
        data: {
          reportId: report.uuid,
          questionId: parseInt(questionId),
          reportType: report.report_type,
          status: report.status,
          createdAt: report.created_at
        }
      });

    } catch (error) {
      console.error('Error submitting question report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // =====================
  // ADMIN ENDPOINTS
  // =====================

  /**
   * Get all reports grouped by question (Dashboard view)
   * GET /api/admin/reports
   */
  async getReportsDashboard(req, res) {
    try {
      const {
        status = 'all',
        reportType = 'all',
        testSeriesId = 'all',
        search = '',
        sortBy = 'reportCount',
        page = 1,
        limit = 20
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause for reports
      let reportWhere = {};
      if (status !== 'all') {
        reportWhere.status = status;
      }
      if (reportType !== 'all') {
        reportWhere.report_type = reportType;
      }

      // Get all reports with question info
      const reports = await QuestionReport.findAll({
        where: reportWhere,
        include: [
          {
            model: Question,
            as: 'question',
            required: true,
            attributes: ['id', 'uuid', 'question_text', 'correct_answer'],
            include: [
              {
                model: Test,
                as: 'test',
                attributes: ['id', 'uuid', 'title'],
                required: false,
                include: [
                  {
                    model: SubCategory,
                    as: 'subCategory',
                    attributes: ['id', 'uuid', 'name'],
                    required: false,
                    include: [
                      {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'uuid', 'name'],
                        required: false,
                        include: [
                          {
                            model: TestSeries,
                            as: 'testSeries',
                            attributes: ['id', 'uuid', 'name'],
                            required: false
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'uuid', 'email', 'username']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Group by question
      const questionMap = new Map();

      reports.forEach(report => {
        const questionId = report.question_id;

        if (!questionMap.has(questionId)) {
          questionMap.set(questionId, {
            questionId: report.question.id,
            questionUuid: report.question.uuid,
            questionText: report.question.question_text,
            correctAnswer: report.question.correct_answer,
            testSeries: null,
            hierarchyPath: [],
            hierarchyString: '',
            totalReports: 0,
            reportBreakdown: {
              wrong_question: 0,
              wrong_solution: 0,
              other: 0
            },
            statusBreakdown: {
              pending: 0,
              under_review: 0,
              resolved: 0,
              rejected: 0
            },
            latestReport: null,
            urgencyLevel: 'normal'
          });
        }

        const questionData = questionMap.get(questionId);
        questionData.totalReports++;
        questionData.reportBreakdown[report.report_type]++;
        questionData.statusBreakdown[report.status]++;

        // Set latest report
        if (!questionData.latestReport || new Date(report.created_at) > new Date(questionData.latestReport.createdAt)) {
          questionData.latestReport = {
            reportId: report.uuid,
            userId: report.user?.id,
            userEmail: report.user?.email,
            reportType: report.report_type,
            reportText: report.report_text,
            status: report.status,
            createdAt: report.created_at
          };
        }

        // Build hierarchy path (only once per question)
        if (questionData.hierarchyPath.length === 0 && report.question?.test) {
          const test = report.question.test;
          const path = [];

          if (test.subCategory?.category?.testSeries) {
            questionData.testSeries = {
              id: test.subCategory.category.testSeries.id,
              uuid: test.subCategory.category.testSeries.uuid,
              name: test.subCategory.category.testSeries.name
            };

            path.push({
              id: test.subCategory.category.id,
              name: test.subCategory.category.name,
              type: 'category'
            });
          }

          if (test.subCategory) {
            path.push({
              id: test.subCategory.id,
              name: test.subCategory.name,
              type: 'subcategory'
            });
          }

          path.push({
            id: test.id,
            name: test.title,
            type: 'test'
          });

          questionData.hierarchyPath = path;
          questionData.hierarchyString = path.map(p => p.name).join(' → ');
        }
      });

      // Convert map to array
      let questionsArray = Array.from(questionMap.values());

      // Apply search filter
      if (search) {
        questionsArray = questionsArray.filter(q =>
          q.questionText?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Apply test series filter
      if (testSeriesId !== 'all') {
        questionsArray = questionsArray.filter(q =>
          q.testSeries?.id === parseInt(testSeriesId)
        );
      }

      // Calculate urgency levels
      questionsArray.forEach(q => {
        if (q.totalReports >= 10) {
          q.urgencyLevel = 'high';
        } else if (q.totalReports >= 5) {
          q.urgencyLevel = 'medium';
        } else {
          q.urgencyLevel = 'normal';
        }
      });

      // Apply sorting
      if (sortBy === 'reportCount') {
        questionsArray.sort((a, b) => b.totalReports - a.totalReports);
      } else if (sortBy === 'latest') {
        questionsArray.sort((a, b) =>
          new Date(b.latestReport?.createdAt || 0) - new Date(a.latestReport?.createdAt || 0)
        );
      } else if (sortBy === 'oldest') {
        questionsArray.sort((a, b) =>
          new Date(a.latestReport?.createdAt || 0) - new Date(b.latestReport?.createdAt || 0)
        );
      }

      // Pagination
      const total = questionsArray.length;
      const paginatedQuestions = questionsArray.slice(offset, offset + parseInt(limit));

      // Get summary statistics
      const summary = {
        totalPending: await QuestionReport.count({ where: { status: 'pending' } }),
        totalUnderReview: await QuestionReport.count({ where: { status: 'under_review' } }),
        totalResolved: await QuestionReport.count({ where: { status: 'resolved' } }),
        totalRejected: await QuestionReport.count({ where: { status: 'rejected' } })
      };

      res.json({
        success: true,
        data: {
          questions: paginatedQuestions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit),
            hasNextPage: offset + parseInt(limit) < total,
            hasPrevPage: parseInt(page) > 1
          },
          summary
        }
      });

    } catch (error) {
      console.error('Error fetching reports dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reports',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all reports for a specific question (Details view)
   * GET /api/admin/reports/question/:questionId
   */
  async getQuestionReports(req, res) {
    try {
      const { questionId } = req.params;
      const { status = 'all', sortBy = 'latest' } = req.query;

      // Get the question with full details
      const question = await Question.findOne({
        where: { id: parseInt(questionId) },
        include: [
          {
            model: Test,
            as: 'test',
            attributes: ['id', 'uuid', 'title'],
            required: false,
            include: [
              {
                model: SubCategory,
                as: 'subCategory',
                attributes: ['id', 'uuid', 'name'],
                required: false,
                include: [
                  {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'uuid', 'name'],
                    required: false,
                    include: [
                      {
                        model: TestSeries,
                        as: 'testSeries',
                        attributes: ['id', 'uuid', 'name'],
                        required: false
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      // Build where clause for reports
      let where = { question_id: parseInt(questionId) };
      if (status !== 'all') {
        where.status = status;
      }

      // Get all reports for this question
      const reports = await QuestionReport.findAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'uuid', 'email', 'username']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'uuid', 'email', 'username']
          }
        ],
        order: sortBy === 'latest' ? [['created_at', 'DESC']] :
               sortBy === 'oldest' ? [['created_at', 'ASC']] :
               [['report_type', 'ASC'], ['created_at', 'DESC']]
      });

      // Build hierarchy path
      const hierarchyPath = [];
      if (question.test?.subCategory?.category?.testSeries) {
        hierarchyPath.push({
          id: question.test.subCategory.category.id,
          name: question.test.subCategory.category.name,
          type: 'category'
        });
      }
      if (question.test?.subCategory) {
        hierarchyPath.push({
          id: question.test.subCategory.id,
          name: question.test.subCategory.name,
          type: 'subcategory'
        });
      }
      if (question.test) {
        hierarchyPath.push({
          id: question.test.id,
          name: question.test.title,
          type: 'test',
          uuid: question.test.uuid
        });
      }

      // Calculate summary
      const summary = {
        totalReports: reports.length,
        reportBreakdown: {
          wrong_question: reports.filter(r => r.report_type === 'wrong_question').length,
          wrong_solution: reports.filter(r => r.report_type === 'wrong_solution').length,
          other: reports.filter(r => r.report_type === 'other').length
        },
        statusBreakdown: {
          pending: reports.filter(r => r.status === 'pending').length,
          under_review: reports.filter(r => r.status === 'under_review').length,
          resolved: reports.filter(r => r.status === 'resolved').length,
          rejected: reports.filter(r => r.status === 'rejected').length
        }
      };

      res.json({
        success: true,
        data: {
          question: {
            id: question.id,
            uuid: question.uuid,
            questionText: question.question_text,
            questionTextGujarati: question.question_text_gujarati,
            options: {
              A: question.option_a,
              B: question.option_b,
              C: question.option_c,
              D: question.option_d
            },
            optionsGujarati: {
              A: question.option_a_gujarati,
              B: question.option_b_gujarati,
              C: question.option_c_gujarati,
              D: question.option_d_gujarati
            },
            correctAnswer: question.correct_answer,
            explanation: question.explanation,
            explanationGujarati: question.explanation_gujarati,
            marks: question.marks,
            negativeMarks: question.negative_marks || 0,
            difficulty: question.difficulty || 'medium',
            subject: question.subject || '',
            topic: question.topic || '',
            testSeries: question.test?.subCategory?.category?.testSeries || null,
            hierarchyPath
          },
          reports: reports.map(r => ({
            id: r.id,
            uuid: r.uuid,
            reportType: r.report_type,
            reportText: r.report_text,
            userSelectedAnswer: r.user_selected_answer,
            status: r.status,
            adminNotes: r.admin_notes,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            reviewedAt: r.reviewed_at,
            user: r.user ? {
              id: r.user.id,
              uuid: r.user.uuid,
              email: r.user.email,
              username: r.user.username
            } : null,
            reviewer: r.reviewer ? {
              id: r.reviewer.id,
              uuid: r.reviewer.uuid,
              email: r.reviewer.email,
              username: r.reviewer.username
            } : null
          })),
          summary
        }
      });

    } catch (error) {
      console.error('Error fetching question reports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch question reports',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update status of a single report
   * PATCH /api/admin/reports/:reportId/status
   */
  async updateReportStatus(req, res) {
    try {
      const { reportId } = req.params;
      const { status, adminNotes } = req.body;
      const adminId = req.admin.id; // From admin JWT middleware

      // Validation
      if (!['pending', 'under_review', 'resolved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: pending, under_review, resolved, rejected'
        });
      }

      if (adminNotes && adminNotes.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Admin notes cannot exceed 1000 characters'
        });
      }

      // Find the report
      const report = await QuestionReport.findOne({
        where: { uuid: reportId }
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      // Update the report (skip reviewed_by for now due to FK constraint with users table)
      await report.update({
        status,
        admin_notes: adminNotes || report.admin_notes,
        // reviewed_by: adminId, // TODO: Fix FK constraint to support admin UUIDs
        reviewed_at: new Date()
      });

      res.json({
        success: true,
        message: 'Report status updated successfully',
        data: {
          reportId: report.uuid,
          questionId: report.question_id,
          status: report.status,
          adminNotes: report.admin_notes,
          reviewedBy: adminId,
          reviewedAt: report.reviewed_at,
          updatedAt: report.updated_at
        }
      });

    } catch (error) {
      console.error('Error updating report status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update report status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Bulk update all reports for a question
   * PATCH /api/admin/reports/question/:questionId/bulk-action
   */
  async bulkUpdateReports(req, res) {
    try {
      const { questionId } = req.params;
      const { action, adminNotes, filterStatus } = req.body;
      const adminId = req.admin.id; // From admin JWT middleware

      // Validation
      if (!['resolve_all', 'reject_all', 'mark_under_review'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be one of: resolve_all, reject_all, mark_under_review'
        });
      }

      // Build where clause
      const where = { question_id: parseInt(questionId) };
      if (filterStatus) {
        where.status = filterStatus;
      }

      // Determine new status based on action
      let newStatus;
      if (action === 'resolve_all') {
        newStatus = 'resolved';
      } else if (action === 'reject_all') {
        newStatus = 'rejected';
      } else if (action === 'mark_under_review') {
        newStatus = 'under_review';
      }

      // Get reports to be updated
      const reports = await QuestionReport.findAll({ where });

      if (reports.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No reports found to update'
        });
      }

      // Update all reports (skip reviewed_by for now due to FK constraint)
      await QuestionReport.update(
        {
          status: newStatus,
          admin_notes: adminNotes || null,
          // reviewed_by: adminId, // TODO: Fix FK constraint to support admin UUIDs
          reviewed_at: new Date()
        },
        { where }
      );

      res.json({
        success: true,
        message: `${reports.length} reports updated successfully`,
        data: {
          questionId: parseInt(questionId),
          action,
          updatedCount: reports.length,
          updatedReports: reports.map(r => ({
            reportId: r.uuid,
            status: newStatus
          })),
          reviewedBy: adminId,
          reviewedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error bulk updating reports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update reports',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get pending reports count
   * GET /api/admin/reports/pending-count
   */
  async getPendingCount(req, res) {
    try {
      const count = await QuestionReport.count({
        where: { status: 'pending' }
      });

      res.json({
        success: true,
        data: { count }
      });

    } catch (error) {
      console.error('Error fetching pending count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending count',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new QuestionReportController();
