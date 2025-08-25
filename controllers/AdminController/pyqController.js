const { PYQ, ExamType, NewQuestion, Admin, User_Score, User_Answers } = require('../../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

const pyqController = {
  // Get all PYQs with filtering, pagination, and statistics
  async getPYQs(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        search,
        exam_type_id,
        exam_year,
        exam_session,
        paper_type,
        conducting_authority,
        is_active,
        is_featured,
        supports_multilanguage,
        created_by,
        year_from,
        year_to,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build where conditions
      const whereConditions = {};
      
      if (search) {
        whereConditions[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { conducting_authority: { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (exam_type_id) whereConditions.exam_type_id = exam_type_id;
      if (exam_year) whereConditions.exam_year = exam_year;
      if (exam_session) whereConditions.exam_session = { [Op.like]: `%${exam_session}%` };
      if (paper_type) whereConditions.paper_type = paper_type;
      if (conducting_authority) whereConditions.conducting_authority = { [Op.like]: `%${conducting_authority}%` };
      if (is_active !== undefined) whereConditions.is_active = is_active === 'true';
      if (is_featured !== undefined) whereConditions.is_featured = is_featured === 'true';
      if (supports_multilanguage !== undefined) whereConditions.supports_multilanguage = supports_multilanguage === 'true';
      if (created_by) whereConditions.created_by = created_by;
      
      if (year_from || year_to) {
        whereConditions.exam_year = {};
        if (year_from) whereConditions.exam_year[Op.gte] = parseInt(year_from);
        if (year_to) whereConditions.exam_year[Op.lte] = parseInt(year_to);
      }

      // Build order conditions
      const validSortFields = ['title', 'exam_year', 'created_at', 'total_questions', 'duration_minutes'];
      const orderField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const { count, rows } = await PYQ.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          },
          {
            model: Admin,
            as: 'creator',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ],
        order: [[orderField, orderDirection]],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Get question counts and attempt counts for each PYQ
      const pyqsWithStats = await Promise.all(rows.map(async (pyq) => {
        const questionCount = await NewQuestion.count({
          where: { 
            test_id: pyq.id,
            test_type: 'pyq'
          }
        });

        // Get actual attempt count from user_scores table
        const attemptCount = await User_Score.count({
          where: { 
            pyq_id: pyq.id,
            test_type: 'pyq',
            status: 'completed'
          }
        });

        return {
          ...pyq.toJSON(),
          questionCount,
          attemptCount
        };
      }));

      const totalPages = Math.ceil(count / parseInt(limit));

      res.json({
        success: true,
        data: pyqsWithStats,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching PYQs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch PYQs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get single PYQ by ID
  async getPYQById(req, res) {
    try {
      const { id } = req.params;

      const pyq = await PYQ.findByPk(id, {
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          },
          {
            model: Admin,
            as: 'creator',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ]
      });

      if (!pyq) {
        return res.status(404).json({
          success: false,
          message: 'PYQ not found'
        });
      }

      // Get question count
      const questionCount = await NewQuestion.count({
        where: { 
          test_id: pyq.id,
          test_type: 'pyq'
        }
      });

      res.json({
        success: true,
        data: {
          ...pyq.toJSON(),
          questionCount
        }
      });
    } catch (error) {
      console.error('Error fetching PYQ:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch PYQ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Create new PYQ
  async createPYQ(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const pyqData = {
        ...req.body,
        created_by: req.user.id // Assuming admin authentication middleware sets req.user
      };

      const pyq = await PYQ.create(pyqData);

      // Fetch the created PYQ with associations
      const createdPYQ = await PYQ.findByPk(pyq.id, {
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      res.status(201).json({
        success: true,
        data: createdPYQ,
        message: 'PYQ created successfully'
      });
    } catch (error) {
      console.error('Error creating PYQ:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create PYQ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update PYQ
  async updatePYQ(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const pyq = await PYQ.findByPk(id);
      if (!pyq) {
        return res.status(404).json({
          success: false,
          message: 'PYQ not found'
        });
      }

      await pyq.update(req.body);

      // Fetch updated PYQ with associations
      const updatedPYQ = await PYQ.findByPk(id, {
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      res.json({
        success: true,
        data: updatedPYQ,
        message: 'PYQ updated successfully'
      });
    } catch (error) {
      console.error('Error updating PYQ:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update PYQ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Delete PYQ
  async deletePYQ(req, res) {
    try {
      const { id } = req.params;

      const pyq = await PYQ.findByPk(id);
      if (!pyq) {
        return res.status(404).json({
          success: false,
          message: 'PYQ not found'
        });
      }

      // Check if PYQ has questions
      const questionCount = await NewQuestion.count({
        where: { 
          test_id: id,
          test_type: 'pyq'
        }
      });

      if (questionCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete PYQ with ${questionCount} questions. Please remove questions first.`
        });
      }

      await pyq.destroy();

      res.json({
        success: true,
        message: 'PYQ deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting PYQ:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete PYQ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Toggle PYQ active status
  async toggleStatus(req, res) {
    try {
      const { id } = req.params;

      const pyq = await PYQ.findByPk(id);
      if (!pyq) {
        return res.status(404).json({
          success: false,
          message: 'PYQ not found'
        });
      }

      await pyq.update({ is_active: !pyq.is_active });

      const updatedPYQ = await PYQ.findByPk(id, {
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      res.json({
        success: true,
        data: updatedPYQ,
        message: `PYQ ${pyq.is_active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling PYQ status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle PYQ status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Toggle featured status
  async toggleFeatured(req, res) {
    try {
      const { id } = req.params;

      const pyq = await PYQ.findByPk(id);
      if (!pyq) {
        return res.status(404).json({
          success: false,
          message: 'PYQ not found'
        });
      }

      await pyq.update({ is_featured: !pyq.is_featured });

      const updatedPYQ = await PYQ.findByPk(id, {
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      res.json({
        success: true,
        data: updatedPYQ,
        message: `PYQ ${pyq.is_featured ? 'added to' : 'removed from'} featured`
      });
    } catch (error) {
      console.error('Error toggling featured status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle featured status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Duplicate PYQ
  async duplicatePYQ(req, res) {
    try {
      const { id } = req.params;
      const { title, year } = req.body;

      const originalPYQ = await PYQ.findByPk(id);
      if (!originalPYQ) {
        return res.status(404).json({
          success: false,
          message: 'PYQ not found'
        });
      }

      // Create duplicate with new title and optional new year
      const duplicateData = {
        ...originalPYQ.toJSON(),
        id: undefined, // Remove ID to create new record
        uuid: undefined, // Let it generate new UUID
        title: title || `${originalPYQ.title} (Copy)`,
        exam_year: year || originalPYQ.exam_year,
        created_by: req.user.id,
        created_at: new Date(),
        updated_at: new Date(),
        is_featured: false // New duplicate should not be featured by default
      };

      const duplicatedPYQ = await PYQ.create(duplicateData);

      // Optionally duplicate questions as well
      const originalQuestions = await NewQuestion.findAll({
        where: { 
          test_id: id,
          test_type: 'pyq'
        }
      });

      if (originalQuestions.length > 0) {
        const duplicatedQuestions = originalQuestions.map(q => ({
          ...q.toJSON(),
          id: undefined,
          test_id: duplicatedPYQ.id,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await NewQuestion.bulkCreate(duplicatedQuestions);
      }

      // Fetch created PYQ with associations
      const result = await PYQ.findByPk(duplicatedPYQ.id, {
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'PYQ duplicated successfully'
      });
    } catch (error) {
      console.error('Error duplicating PYQ:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate PYQ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get PYQ statistics
  async getPYQStats(req, res) {
    try {
      // Basic counts
      const [
        totalPYQs,
        activePYQs,
        featuredPYQs,
        totalQuestions,
        uniqueExamTypes
      ] = await Promise.all([
        PYQ.count(),
        PYQ.count({ where: { is_active: true } }),
        PYQ.count({ where: { is_featured: true } }),
        NewQuestion.count({ where: { test_type: 'pyq' } }),
        PYQ.count({
          distinct: true,
          col: 'exam_type_id'
        })
      ]);

      // Year range
      const yearRange = await PYQ.findOne({
        attributes: [
          [PYQ.sequelize.fn('MIN', PYQ.sequelize.col('exam_year')), 'earliest'],
          [PYQ.sequelize.fn('MAX', PYQ.sequelize.col('exam_year')), 'latest']
        ]
      });

      // Exam type breakdown
      const examTypeBreakdown = await PYQ.findAll({
        attributes: [
          [PYQ.sequelize.col('examType.name'), 'examType'],
          [PYQ.sequelize.fn('COUNT', PYQ.sequelize.col('PYQ.id')), 'count']
        ],
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: []
          }
        ],
        group: ['examType.id', 'examType.name'],
        raw: true
      });

      // Yearly breakdown
      const yearlyBreakdown = await PYQ.findAll({
        attributes: [
          'exam_year',
          [PYQ.sequelize.fn('COUNT', PYQ.sequelize.col('id')), 'count']
        ],
        group: ['exam_year'],
        order: [['exam_year', 'DESC']],
        limit: 10,
        raw: true
      });

      // Paper type breakdown
      const paperTypeBreakdown = await PYQ.findAll({
        attributes: [
          'paper_type',
          [PYQ.sequelize.fn('COUNT', PYQ.sequelize.col('id')), 'count']
        ],
        group: ['paper_type'],
        raw: true
      });

      // Get total attempts across all PYQs
      const totalAttempts = await User_Score.count({
        where: { 
          test_type: 'pyq',
          status: 'completed'
        }
      });

      // Recent PYQs (popular ones based on attempt count)
      const popularPYQs = await PYQ.findAll({
        attributes: ['id', 'title', 'exam_year'],
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: ['name']
          },
          {
            model: User_Score,
            as: 'userScores',
            attributes: [],
            where: { 
              test_type: 'pyq',
              status: 'completed'
            },
            required: false
          }
        ],
        where: { is_active: true },
        group: ['PYQ.id', 'examType.id'],
        order: [
          [PYQ.sequelize.fn('COUNT', PYQ.sequelize.col('userScores.id')), 'DESC'],
          ['created_at', 'DESC']
        ],
        limit: 5,
        subQuery: false
      });

      // Get attempt counts for popular PYQs
      const popularPYQsWithAttempts = await Promise.all(
        popularPYQs.map(async (pyq) => {
          const attemptCount = await User_Score.count({
            where: { 
              pyq_id: pyq.id,
              test_type: 'pyq',
              status: 'completed'
            }
          });
          return {
            id: pyq.id,
            title: pyq.title,
            attempts: attemptCount,
            examType: pyq.examType?.name || 'Unknown',
            year: pyq.exam_year
          };
        })
      );

      // Get attempt counts by exam type
      const examTypeAttempts = await Promise.all(
        examTypeBreakdown.map(async (item) => {
          const attempts = await User_Score.count({
            include: [{
              model: PYQ,
              as: 'pyq',
              include: [{
                model: ExamType,
                as: 'examType',
                where: { name: item.examType }
              }]
            }],
            where: { 
              test_type: 'pyq',
              status: 'completed'
            }
          });
          return {
            examType: item.examType,
            count: parseInt(item.count),
            attempts
          };
        })
      );

      // Get attempt counts by year
      const yearlyAttempts = await Promise.all(
        yearlyBreakdown.map(async (item) => {
          const attempts = await User_Score.count({
            include: [{
              model: PYQ,
              as: 'pyq',
              where: { exam_year: item.exam_year }
            }],
            where: { 
              test_type: 'pyq',
              status: 'completed'
            }
          });
          return {
            year: item.exam_year,
            count: parseInt(item.count),
            attempts
          };
        })
      );

      // Get attempt counts by paper type
      const paperTypeAttempts = await Promise.all(
        paperTypeBreakdown.map(async (item) => {
          const attempts = await User_Score.count({
            include: [{
              model: PYQ,
              as: 'pyq',
              where: { paper_type: item.paper_type }
            }],
            where: { 
              test_type: 'pyq',
              status: 'completed'
            }
          });
          return {
            type: item.paper_type,
            count: parseInt(item.count),
            attempts
          };
        })
      );

      // Get recent activity (recent attempts)
      const recentActivity = await User_Score.findAll({
        attributes: ['created_at', 'percentage', 'time_taken'],
        include: [
          {
            model: PYQ,
            as: 'pyq',
            attributes: ['title', 'exam_year']
          }
        ],
        where: { 
          test_type: 'pyq',
          status: 'completed'
        },
        order: [['created_at', 'DESC']],
        limit: 10
      });

      res.json({
        success: true,
        data: {
          totalPYQs,
          activePYQs,
          featuredPYQs,
          totalQuestions,
          totalAttempts,
          uniqueExamTypes,
          yearRange: {
            earliest: yearRange?.dataValues?.earliest || new Date().getFullYear(),
            latest: yearRange?.dataValues?.latest || new Date().getFullYear()
          },
          examTypeBreakdown: examTypeAttempts,
          yearlyBreakdown: yearlyAttempts,
          paperTypeBreakdown: paperTypeAttempts,
          popularPYQs: popularPYQsWithAttempts,
          recentActivity: recentActivity.map(activity => ({
            date: activity.created_at,
            title: activity.pyq?.title || 'Unknown PYQ',
            year: activity.pyq?.exam_year || 'Unknown',
            percentage: activity.percentage,
            time_taken: activity.time_taken
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching PYQ stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch PYQ statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get available exam years
  async getExamYears(req, res) {
    try {
      const { exam_type_id } = req.query;
      
      const whereConditions = exam_type_id ? { exam_type_id } : {};
      
      const years = await PYQ.findAll({
        attributes: [
          'exam_year',
          [PYQ.sequelize.fn('COUNT', PYQ.sequelize.col('id')), 'count']
        ],
        where: whereConditions,
        group: ['exam_year'],
        order: [['exam_year', 'DESC']],
        raw: true
      });

      res.json({
        success: true,
        data: years.map(item => ({
          year: item.exam_year,
          count: parseInt(item.count)
        }))
      });
    } catch (error) {
      console.error('Error fetching exam years:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch exam years',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get available exam sessions
  async getExamSessions(req, res) {
    try {
      const { exam_type_id, year } = req.query;
      
      const whereConditions = {};
      if (exam_type_id) whereConditions.exam_type_id = exam_type_id;
      if (year) whereConditions.exam_year = year;
      whereConditions.exam_session = { [Op.ne]: null };
      
      const sessions = await PYQ.findAll({
        attributes: [
          'exam_session',
          [PYQ.sequelize.fn('COUNT', PYQ.sequelize.col('id')), 'count']
        ],
        where: whereConditions,
        group: ['exam_session'],
        order: [['exam_session', 'ASC']],
        raw: true
      });

      res.json({
        success: true,
        data: sessions.map(item => ({
          session: item.exam_session,
          count: parseInt(item.count)
        }))
      });
    } catch (error) {
      console.error('Error fetching exam sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch exam sessions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get conducting authorities
  async getConductingAuthorities(req, res) {
    try {
      const authorities = await PYQ.findAll({
        attributes: ['conducting_authority'],
        where: {
          conducting_authority: { [Op.ne]: null }
        },
        group: ['conducting_authority'],
        order: [['conducting_authority', 'ASC']],
        raw: true
      });

      res.json({
        success: true,
        data: authorities.map(item => item.conducting_authority).filter(Boolean)
      });
    } catch (error) {
      console.error('Error fetching conducting authorities:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conducting authorities',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get PYQ attempt statistics for a specific PYQ
  async getPYQAttempts(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Verify PYQ exists
      const pyq = await PYQ.findByPk(id);
      if (!pyq) {
        return res.status(404).json({
          success: false,
          message: 'PYQ not found'
        });
      }

      // Get attempt statistics
      const [totalAttempts, avgScore, completedAttempts] = await Promise.all([
        User_Score.count({
          where: { pyq_id: id, test_type: 'pyq' }
        }),
        User_Score.findOne({
          attributes: [
            [User_Score.sequelize.fn('AVG', User_Score.sequelize.col('percentage')), 'avg_score']
          ],
          where: { pyq_id: id, test_type: 'pyq', status: 'completed' },
          raw: true
        }),
        User_Score.count({
          where: { pyq_id: id, test_type: 'pyq', status: 'completed' }
        })
      ]);

      // Get recent attempts with user details
      const recentAttempts = await User_Score.findAndCountAll({
        where: { pyq_id: id, test_type: 'pyq' },
        include: [
          {
            model: require('../../models').User,
            as: 'user',
            attributes: ['uuid', 'username', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: {
          pyq: {
            id: pyq.id,
            title: pyq.title,
            exam_year: pyq.exam_year
          },
          statistics: {
            totalAttempts,
            completedAttempts,
            avgScore: avgScore?.avg_score ? parseFloat(avgScore.avg_score).toFixed(2) : 0,
            completionRate: totalAttempts > 0 ? ((completedAttempts / totalAttempts) * 100).toFixed(2) : 0
          },
          attempts: recentAttempts.rows.map(attempt => ({
            id: attempt.id,
            user: {
              uuid: attempt.user?.uuid,
              username: attempt.user?.username,
              email: attempt.user?.email
            },
            score: attempt.total_score,
            percentage: attempt.percentage,
            correct_answers: attempt.correct_answers,
            wrong_answers: attempt.wrong_answers,
            unanswered: attempt.unanswered,
            time_taken: attempt.time_taken,
            status: attempt.status,
            attempt_number: attempt.attempt_number,
            started_at: attempt.started_at,
            completed_at: attempt.completed_at,
            created_at: attempt.created_at
          })),
          pagination: {
            total: recentAttempts.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(recentAttempts.count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching PYQ attempts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch PYQ attempts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get PYQ leaderboard
  async getPYQLeaderboard(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      // Verify PYQ exists
      const pyq = await PYQ.findByPk(id);
      if (!pyq) {
        return res.status(404).json({
          success: false,
          message: 'PYQ not found'
        });
      }

      // Get top scores for this PYQ
      const leaderboard = await User_Score.findAll({
        where: { 
          pyq_id: id, 
          test_type: 'pyq',
          status: 'completed'
        },
        include: [
          {
            model: require('../../models').User,
            as: 'user',
            attributes: ['uuid', 'username']
          }
        ],
        order: [
          ['percentage', 'DESC'],
          ['time_taken', 'ASC'],
          ['created_at', 'ASC']
        ],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: {
          pyq: {
            id: pyq.id,
            title: pyq.title,
            exam_year: pyq.exam_year
          },
          leaderboard: leaderboard.map((entry, index) => ({
            rank: index + 1,
            user: {
              uuid: entry.user?.uuid,
              username: entry.user?.username
            },
            score: entry.total_score,
            percentage: entry.percentage,
            correct_answers: entry.correct_answers,
            wrong_answers: entry.wrong_answers,
            time_taken: entry.time_taken,
            attempt_date: entry.completed_at || entry.created_at
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching PYQ leaderboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch PYQ leaderboard',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = pyqController;