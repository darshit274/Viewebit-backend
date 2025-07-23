const { QuestionTranslation, NewQuestion, Admin, ExamType } = require('../../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');

const translationController = {
  // Get all translations with filtering and pagination
  async getTranslations(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        language_code,
        translation_status,
        quality_score_min,
        quality_score_max,
        translated_by,
        reviewed_by,
        question_id,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build where conditions
      const whereConditions = {};
      
      if (search) {
        whereConditions[Op.or] = [
          { question_text: { [Op.like]: `%${search}%` } },
          { option_a: { [Op.like]: `%${search}%` } },
          { option_b: { [Op.like]: `%${search}%` } },
          { option_c: { [Op.like]: `%${search}%` } },
          { option_d: { [Op.like]: `%${search}%` } },
          { explanation: { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (language_code) whereConditions.language_code = language_code;
      if (translation_status) whereConditions.translation_status = translation_status;
      if (translated_by) whereConditions.translated_by = translated_by;
      if (reviewed_by) whereConditions.reviewed_by = reviewed_by;
      if (question_id) whereConditions.question_id = question_id;
      
      if (quality_score_min || quality_score_max) {
        whereConditions.quality_score = {};
        if (quality_score_min) whereConditions.quality_score[Op.gte] = parseInt(quality_score_min);
        if (quality_score_max) whereConditions.quality_score[Op.lte] = parseInt(quality_score_max);
      }

      // Build order conditions
      const validSortFields = ['created_at', 'language_code', 'translation_status', 'quality_score'];
      const orderField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const { count, rows } = await QuestionTranslation.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: NewQuestion,
            as: 'question',
            attributes: ['id', 'question_text', 'difficulty_level', 'subject', 'topic'],
            include: [
              {
                model: ExamType,
                as: 'examType',
                attributes: ['id', 'name', 'code'],
                required: false
              }
            ]
          },
          {
            model: Admin,
            as: 'translator',
            attributes: ['id', 'name', 'email'],
            required: false
          },
          {
            model: Admin,
            as: 'reviewer',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ],
        order: [[orderField, orderDirection]],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      const totalPages = Math.ceil(count / parseInt(limit));

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching translations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch translations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get single translation by ID
  async getTranslationById(req, res) {
    try {
      const { id } = req.params;

      const translation = await QuestionTranslation.findByPk(id, {
        include: [
          {
            model: NewQuestion,
            as: 'question',
            include: [
              {
                model: ExamType,
                as: 'examType',
                attributes: ['id', 'name', 'code'],
                required: false
              }
            ]
          },
          {
            model: Admin,
            as: 'translator',
            attributes: ['id', 'name', 'email'],
            required: false
          },
          {
            model: Admin,
            as: 'reviewer',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ]
      });

      if (!translation) {
        return res.status(404).json({
          success: false,
          message: 'Translation not found'
        });
      }

      res.json({
        success: true,
        data: translation
      });
    } catch (error) {
      console.error('Error fetching translation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch translation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Create new translation
  async createTranslation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check if translation already exists for this question and language
      const existingTranslation = await QuestionTranslation.findOne({
        where: {
          question_id: req.body.question_id,
          language_code: req.body.language_code
        }
      });

      if (existingTranslation) {
        return res.status(400).json({
          success: false,
          message: 'Translation already exists for this question and language'
        });
      }

      const translationData = {
        ...req.body,
        translated_by: req.user.id,
        translated_at: new Date()
      };

      const translation = await QuestionTranslation.create(translationData);

      // Fetch the created translation with associations
      const createdTranslation = await QuestionTranslation.findByPk(translation.id, {
        include: [
          {
            model: NewQuestion,
            as: 'question',
            attributes: ['id', 'question_text', 'difficulty_level', 'subject', 'topic']
          }
        ]
      });

      res.status(201).json({
        success: true,
        data: createdTranslation,
        message: 'Translation created successfully'
      });
    } catch (error) {
      console.error('Error creating translation:', error);
      
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
        message: 'Failed to create translation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update translation
  async updateTranslation(req, res) {
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

      const translation = await QuestionTranslation.findByPk(id);
      if (!translation) {
        return res.status(404).json({
          success: false,
          message: 'Translation not found'
        });
      }

      await translation.update(req.body);

      // Fetch updated translation with associations
      const updatedTranslation = await QuestionTranslation.findByPk(id, {
        include: [
          {
            model: NewQuestion,
            as: 'question',
            attributes: ['id', 'question_text', 'difficulty_level', 'subject', 'topic']
          }
        ]
      });

      res.json({
        success: true,
        data: updatedTranslation,
        message: 'Translation updated successfully'
      });
    } catch (error) {
      console.error('Error updating translation:', error);
      
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
        message: 'Failed to update translation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Delete translation
  async deleteTranslation(req, res) {
    try {
      const { id } = req.params;

      const translation = await QuestionTranslation.findByPk(id);
      if (!translation) {
        return res.status(404).json({
          success: false,
          message: 'Translation not found'
        });
      }

      await translation.destroy();

      res.json({
        success: true,
        message: 'Translation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting translation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete translation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update translation status
  async updateTranslationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, quality_score } = req.body;

      const translation = await QuestionTranslation.findByPk(id);
      if (!translation) {
        return res.status(404).json({
          success: false,
          message: 'Translation not found'
        });
      }

      const updateData = { translation_status: status };
      
      if (status === 'review' && translation.translation_status === 'draft') {
        // Moving to review
        updateData.reviewed_by = req.user.id;
        updateData.reviewed_at = new Date();
      } else if (status === 'approved' || status === 'published') {
        // Approving or publishing
        updateData.reviewed_by = req.user.id;
        updateData.reviewed_at = new Date();
        if (quality_score) {
          updateData.quality_score = quality_score;
        }
      }

      await translation.update(updateData);

      const updatedTranslation = await QuestionTranslation.findByPk(id, {
        include: [
          {
            model: NewQuestion,
            as: 'question',
            attributes: ['id', 'question_text']
          },
          {
            model: Admin,
            as: 'reviewer',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ]
      });

      res.json({
        success: true,
        data: updatedTranslation,
        message: `Translation status updated to ${status}`
      });
    } catch (error) {
      console.error('Error updating translation status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update translation status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get translation statistics
  async getTranslationStats(req, res) {
    try {
      const [
        totalTranslations,
        draftCount,
        reviewCount,
        approvedCount,
        publishedCount,
        uniqueLanguages,
        uniqueTranslators
      ] = await Promise.all([
        QuestionTranslation.count(),
        QuestionTranslation.count({ where: { translation_status: 'draft' } }),
        QuestionTranslation.count({ where: { translation_status: 'review' } }),
        QuestionTranslation.count({ where: { translation_status: 'approved' } }),
        QuestionTranslation.count({ where: { translation_status: 'published' } }),
        QuestionTranslation.count({
          distinct: true,
          col: 'language_code'
        }),
        QuestionTranslation.count({
          distinct: true,
          col: 'translated_by',
          where: { translated_by: { [Op.ne]: null } }
        })
      ]);

      // Language breakdown
      const languageBreakdown = await QuestionTranslation.findAll({
        attributes: [
          'language_code',
          'language_name',
          [QuestionTranslation.sequelize.fn('COUNT', QuestionTranslation.sequelize.col('id')), 'count']
        ],
        group: ['language_code', 'language_name'],
        order: [['count', 'DESC']],
        raw: true
      });

      // Status breakdown
      const statusBreakdown = await QuestionTranslation.findAll({
        attributes: [
          'translation_status',
          [QuestionTranslation.sequelize.fn('COUNT', QuestionTranslation.sequelize.col('id')), 'count']
        ],
        group: ['translation_status'],
        raw: true
      });

      // Quality score distribution
      const qualityDistribution = await QuestionTranslation.findAll({
        attributes: [
          'quality_score',
          [QuestionTranslation.sequelize.fn('COUNT', QuestionTranslation.sequelize.col('id')), 'count']
        ],
        where: { quality_score: { [Op.ne]: null } },
        group: ['quality_score'],
        order: [['quality_score', 'ASC']],
        raw: true
      });

      // Recent translations
      const recentTranslations = await QuestionTranslation.findAll({
        attributes: ['id', 'language_code', 'language_name', 'translation_status', 'created_at'],
        include: [
          {
            model: NewQuestion,
            as: 'question',
            attributes: ['id', 'question_text']
          },
          {
            model: Admin,
            as: 'translator',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 10
      });

      res.json({
        success: true,
        data: {
          totalTranslations,
          statusCounts: {
            draft: draftCount,
            review: reviewCount,
            approved: approvedCount,
            published: publishedCount
          },
          uniqueLanguages,
          uniqueTranslators,
          languageBreakdown: languageBreakdown.map(item => ({
            language_code: item.language_code,
            language_name: item.language_name,
            count: parseInt(item.count)
          })),
          statusBreakdown: statusBreakdown.map(item => ({
            status: item.translation_status,
            count: parseInt(item.count)
          })),
          qualityDistribution: qualityDistribution.map(item => ({
            score: item.quality_score,
            count: parseInt(item.count)
          })),
          recentTranslations: recentTranslations.map(translation => ({
            id: translation.id,
            language: `${translation.language_name} (${translation.language_code})`,
            status: translation.translation_status,
            question: translation.question?.question_text?.substring(0, 100) + '...',
            translator: translation.translator?.name || 'Unknown',
            created_at: translation.created_at
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching translation stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch translation statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get available languages
  async getAvailableLanguages(req, res) {
    try {
      const languages = await QuestionTranslation.findAll({
        attributes: ['language_code', 'language_name'],
        group: ['language_code', 'language_name'],
        order: [['language_name', 'ASC']]
      });

      res.json({
        success: true,
        data: languages
      });
    } catch (error) {
      console.error('Error fetching available languages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available languages',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get questions that need translation for a specific language
  async getQuestionsNeedingTranslation(req, res) {
    try {
      const { language_code, page = 1, limit = 20 } = req.query;
      
      if (!language_code) {
        return res.status(400).json({
          success: false,
          message: 'Language code is required'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Find questions that don't have translations in the specified language
      const questionsWithoutTranslation = await NewQuestion.findAndCountAll({
        where: {
          id: {
            [Op.notIn]: QuestionTranslation.sequelize.literal(`
              (SELECT question_id FROM question_translations 
               WHERE language_code = '${language_code}')
            `)
          }
        },
        include: [
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      const totalPages = Math.ceil(questionsWithoutTranslation.count / parseInt(limit));

      res.json({
        success: true,
        data: questionsWithoutTranslation.rows,
        pagination: {
          total: questionsWithoutTranslation.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching questions needing translation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch questions needing translation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Bulk update translation status
  async bulkUpdateStatus(req, res) {
    try {
      const { translation_ids, status, quality_score } = req.body;

      if (!translation_ids || !Array.isArray(translation_ids) || translation_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Translation IDs array is required'
        });
      }

      const updateData = { 
        translation_status: status,
        reviewed_by: req.user.id,
        reviewed_at: new Date()
      };

      if (quality_score) {
        updateData.quality_score = quality_score;
      }

      const [updatedCount] = await QuestionTranslation.update(updateData, {
        where: { id: { [Op.in]: translation_ids } }
      });

      res.json({
        success: true,
        message: `${updatedCount} translations updated successfully`,
        updatedCount
      });
    } catch (error) {
      console.error('Error bulk updating translation status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update translation status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = translationController;