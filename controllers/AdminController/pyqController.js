const { PYQ, ExamType, NewQuestion, Admin } = require('../../models');
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

        // TODO: Add attempt count from user_scores table when implemented
        const attemptCount = 0; // Placeholder

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

      // Recent PYQs (popular ones would need user_scores data)
      const popularPYQs = await PYQ.findAll({
        attributes: ['id', 'title', 'exam_year'],
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: ['name']
          }
        ],
        where: { is_active: true },
        order: [['created_at', 'DESC']],
        limit: 5
      });

      res.json({
        success: true,
        data: {
          totalPYQs,
          activePYQs,
          featuredPYQs,
          totalQuestions,
          totalAttempts: 0, // TODO: Implement when user_scores is ready
          uniqueExamTypes,
          yearRange: {
            earliest: yearRange?.dataValues?.earliest || new Date().getFullYear(),
            latest: yearRange?.dataValues?.latest || new Date().getFullYear()
          },
          examTypeBreakdown: examTypeBreakdown.map(item => ({
            examType: item.examType,
            count: parseInt(item.count),
            attempts: 0 // TODO: Add when user attempts are tracked
          })),
          yearlyBreakdown: yearlyBreakdown.map(item => ({
            year: item.exam_year,
            count: parseInt(item.count),
            attempts: 0 // TODO: Add when user attempts are tracked
          })),
          paperTypeBreakdown: paperTypeBreakdown.map(item => ({
            type: item.paper_type,
            count: parseInt(item.count),
            attempts: 0 // TODO: Add when user attempts are tracked
          })),
          popularPYQs: popularPYQs.map(pyq => ({
            id: pyq.id,
            title: pyq.title,
            attempts: 0, // TODO: Add when user attempts are tracked
            examType: pyq.examType?.name || 'Unknown',
            year: pyq.exam_year
          })),
          recentActivity: [] // TODO: Implement activity tracking
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
  }
};

module.exports = pyqController;