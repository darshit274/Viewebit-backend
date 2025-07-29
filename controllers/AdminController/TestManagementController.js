const {
  ExamCategory,
  TestSeries,
  Test,
  Question,
  TestSession,
  UserAnswer,
  UserSubscription,
  TestAnalytics,
  ExamType,
  Admin,
  User
} = require('../../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const testManagementController = {

  // ============= EXAM CATEGORY MANAGEMENT =============

  /**
   * Get all exam categories with hierarchical structure
   */
  async getExamCategories(req, res) {
    try {
      const { level, parent_id, include_stats = false } = req.query;
      
      const whereConditions = { is_active: true };
      if (level !== undefined) whereConditions.hierarchy_level = parseInt(level);
      if (parent_id) whereConditions.parent_id = parent_id;
      
      const includeArray = [
        {
          model: ExamCategory,
          as: 'parent',
          attributes: ['id', 'name', 'name_gujarati']
        },
        {
          model: ExamCategory,
          as: 'children',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'name', 'name_gujarati', 'hierarchy_level', 'display_order']
        }
      ];

      if (include_stats === 'true') {
        includeArray.push({
          model: TestSeries,
          as: 'testSeries',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'title', 'is_published', 'total_tests']
        });
      }

      const categories = await ExamCategory.findAll({
        where: whereConditions,
        include: includeArray,
        order: [
          ['hierarchy_level', 'ASC'],
          ['display_order', 'ASC'],
          ['name', 'ASC'],
          [{ model: ExamCategory, as: 'children' }, 'display_order', 'ASC']
        ]
      });

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching exam categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch exam categories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Create new exam category
   */
  async createExamCategory(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        name,
        name_gujarati,
        description,
        description_gujarati,
        hierarchy_level = 0,
        parent_id,
        display_order = 0,
        color_code,
        icon_url
      } = req.body;

      // Generate hierarchy path
      let hierarchy_path = '';
      if (parent_id) {
        const parentCategory = await ExamCategory.findByPk(parent_id);
        if (!parentCategory) {
          return res.status(400).json({
            success: false,
            message: 'Parent category not found'
          });
        }
        hierarchy_path = `${parentCategory.hierarchy_path}/${parent_id}`;
      }

      const category = await ExamCategory.create({
        name,
        name_gujarati,
        description,
        description_gujarati,
        hierarchy_level,
        parent_id,
        hierarchy_path,
        display_order,
        color_code,
        icon_url
      });

      res.status(201).json({
        success: true,
        message: 'Exam category created successfully',
        data: category
      });
    } catch (error) {
      console.error('Error creating exam category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create exam category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ============= TEST SERIES MANAGEMENT =============

  /**
   * Get all test series with advanced filtering
   */
  async getTestSeries(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        search,
        category_id,
        exam_type_id,
        is_published,
        is_active,
        is_featured,
        difficulty_level,
        price_min,
        price_max,
        created_by,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const whereConditions = {};
      
      if (search) {
        whereConditions[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { title_gujarati: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (category_id) whereConditions.category_id = category_id;
      if (exam_type_id) whereConditions.exam_type_id = exam_type_id;
      if (is_published !== undefined) whereConditions.is_published = is_published === 'true';
      if (is_active !== undefined) whereConditions.is_active = is_active === 'true';
      if (is_featured !== undefined) whereConditions.is_featured = is_featured === 'true';
      if (difficulty_level) whereConditions.difficulty_level = difficulty_level;
      if (created_by) whereConditions.created_by = created_by;

      if (price_min || price_max) {
        whereConditions.price = {};
        if (price_min) whereConditions.price[Op.gte] = parseFloat(price_min);
        if (price_max) whereConditions.price[Op.lte] = parseFloat(price_max);
      }

      const { count, rows } = await TestSeries.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: ExamCategory,
            as: 'category',
            attributes: ['id', 'name', 'name_gujarati', 'hierarchy_level']
          },
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          },
          {
            model: TestSeries,
            as: 'parentSeries',
            attributes: ['id', 'title', 'hierarchy_path']
          },
          {
            model: Admin,
            as: 'creator',
            attributes: ['id', 'name']
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Get additional statistics for each series
      const enhancedRows = await Promise.all(rows.map(async (series) => {
        const [testsCount, questionsCount, subscribersCount] = await Promise.all([
          Test.count({ where: { test_series_id: series.id, is_active: true } }),
          Question.count({
            include: [{
              model: Test,
              as: 'test',
              where: { test_series_id: series.id },
              attributes: []
            }]
          }),
          UserSubscription.count({
            where: { 
              test_series_id: series.id,
              status: 'active'
            }
          })
        ]);

        return {
          ...series.toJSON(),
          actualTestsCount: testsCount,
          actualQuestionsCount: questionsCount,
          activeSubscribers: subscribersCount
        };
      }));

      res.json({
        success: true,
        data: {
          testSeries: enhancedRows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test series',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Create new test series
   */
  async createTestSeries(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const seriesData = {
        ...req.body,
        created_by: req.admin?.id,
        uuid: uuidv4()
      };

      // Generate hierarchy path if parent series exists
      if (seriesData.parent_series_id) {
        const parentSeries = await TestSeries.findByPk(seriesData.parent_series_id);
        if (parentSeries) {
          seriesData.hierarchy_path = parentSeries.hierarchy_path 
            ? `${parentSeries.hierarchy_path}/${seriesData.parent_series_id}`
            : `/${seriesData.parent_series_id}`;
        }
      }

      const testSeries = await TestSeries.create(seriesData);

      // Include related data in response
      const testSeriesWithDetails = await TestSeries.findByPk(testSeries.id, {
        include: [
          {
            model: ExamCategory,
            as: 'category',
            attributes: ['id', 'name', 'name_gujarati']
          },
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Test series created successfully',
        data: testSeriesWithDetails
      });
    } catch (error) {
      console.error('Error creating test series:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'UUID or slug must be unique'
        });
      }

      console.error('Error creating test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test series',
        error: error.message
      });
    }
  },

  /**
   * Update test series
   */
  async updateTestSeries(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const testSeries = await TestSeries.findByPk(id);
      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      // Update hierarchy path if parent changed
      if (updateData.parent_series_id !== undefined) {
        let hierarchy_path = '';
        if (updateData.parent_series_id) {
          const parentSeries = await TestSeries.findByPk(updateData.parent_series_id);
          if (parentSeries) {
            hierarchy_path = parentSeries.hierarchy_path 
              ? `${parentSeries.hierarchy_path}/${updateData.parent_series_id}`
              : `/${updateData.parent_series_id}`;
          }
        }
        updateData.hierarchy_path = hierarchy_path;
      }

      await testSeries.update(updateData);

      const updatedTestSeries = await TestSeries.findByPk(id, {
        include: [
          {
            model: ExamCategory,
            as: 'category',
            attributes: ['id', 'name', 'name_gujarati']
          },
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Test series updated successfully',
        data: updatedTestSeries
      });
    } catch (error) {
      console.error('Error updating test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update test series',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Delete test series
   */
  async deleteTestSeries(req, res) {
    try {
      const { id } = req.params;

      const testSeries = await TestSeries.findByPk(id);
      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      // Check if series has active subscriptions
      const activeSubscriptions = await UserSubscription.count({
        where: { 
          test_series_id: id,
          status: 'active'
        }
      });

      if (activeSubscriptions > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete test series. It has ${activeSubscriptions} active subscription(s).`
        });
      }

      // Check if series has tests with sessions
      const testsWithSessions = await Test.count({
        where: { test_series_id: id },
        include: [{
          model: TestSession,
          as: 'sessions',
          required: true
        }]
      });

      if (testsWithSessions > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete test series. Some tests have user sessions.'
        });
      }

      await testSeries.destroy();

      res.json({
        success: true,
        message: 'Test series deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete test series',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Toggle publish status
   */
  async togglePublishStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_published } = req.body;

      const testSeries = await TestSeries.findByPk(id);
      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      const updateData = { is_published };
      if (is_published && !testSeries.published_at) {
        updateData.published_at = new Date();
      }

      await testSeries.update(updateData);

      res.json({
        success: true,
        message: `Test series ${is_published ? 'published' : 'unpublished'} successfully`,
        data: {
          id: testSeries.id,
          is_published,
          published_at: updateData.published_at || testSeries.published_at
        }
      });
    } catch (error) {
      console.error('Error toggling publish status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update publish status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ============= TEST MANAGEMENT =============

  /**
   * Get tests for a series
   */
  async getTestsForSeries(req, res) {
    try {
      const { seriesId } = req.params;
      const { include_questions = false } = req.query;

      const includeArray = [];
      
      if (include_questions === 'true') {
        includeArray.push({
          model: Question,
          as: 'questions',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'question', 'subject', 'difficulty', 'marks'],
          order: [['display_order', 'ASC']]
        });
      }

      const tests = await Test.findAll({
        where: { test_series_id: seriesId },
        include: includeArray,
        order: [['display_order', 'ASC'], ['created_at', 'ASC']]
      });

      // Get question counts and attempt statistics
      const testsWithStats = await Promise.all(tests.map(async (test) => {
        const [questionCount, attemptCount, avgScore] = await Promise.all([
          Question.count({
            where: { 
              test_id: test.id, 
              is_active: true 
            }
          }),
          TestSession.count({
            where: { 
              test_id: test.id,
              status: 'completed'
            }
          }),
          TestSession.findOne({
            attributes: [
              [TestSession.sequelize.fn('AVG', TestSession.sequelize.col('percentage')), 'avg_score']
            ],
            where: { 
              test_id: test.id,
              status: 'completed'
            },
            raw: true
          })
        ]);

        return {
          ...test.toJSON(),
          actualQuestionCount: questionCount,
          attemptCount,
          averageScore: avgScore?.avg_score ? parseFloat(avgScore.avg_score).toFixed(2) : 0
        };
      }));

      res.json({
        success: true,
        data: testsWithStats
      });
    } catch (error) {
      console.error('Error fetching tests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tests',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Create test within a series
   */
  async createTest(req, res) {
    try {
      const { seriesId } = req.params;
      const testData = {
        ...req.body,
        test_series_id: seriesId,
        uuid: uuidv4()
      };

      // Verify test series exists
      const testSeries = await TestSeries.findByPk(seriesId);
      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      const test = await Test.create(testData);

      res.status(201).json({
        success: true,
        message: 'Test created successfully',
        data: test
      });
    } catch (error) {
      console.error('Error creating test:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Update test
   */
  async updateTest(req, res) {
    try {
      const { testId } = req.params;
      const updateData = req.body;

      const test = await Test.findByPk(testId);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      // Convert date strings to Date objects if provided
      if (updateData.available_from) {
        updateData.available_from = new Date(updateData.available_from);
      }
      if (updateData.available_until) {
        updateData.available_until = new Date(updateData.available_until);
      }

      await test.update(updateData);

      res.json({
        success: true,
        message: 'Test updated successfully',
        data: test
      });
    } catch (error) {
      console.error('Error updating test:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update test',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Delete test
   */
  async deleteTest(req, res) {
    try {
      const { testId } = req.params;

      const test = await Test.findByPk(testId);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      // Check if test has any attempts
      const attemptCount = await TestSession.count({
        where: { test_id: testId }
      });

      if (attemptCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete test. It has ${attemptCount} attempt(s) by users.`
        });
      }

      await test.destroy();

      res.json({
        success: true,
        message: 'Test deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting test:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete test',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ============= QUESTION MANAGEMENT =============

  /**
   * Get questions for a test
   */
  async getQuestionsForTest(req, res) {
    try {
      const { testId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await Question.findAndCountAll({
        where: { test_id: testId },
        include: [{
          model: Admin,
          as: 'creator',
          attributes: ['id', 'name']
        }],
        order: [['display_order', 'ASC'], ['created_at', 'ASC']],
        limit: parseInt(limit),
        offset: offset
      });

      // Get statistics for each question
      const questionsWithStats = await Promise.all(rows.map(async (question) => {
        const [totalAttempts, correctAttempts] = await Promise.all([
          UserAnswer.count({
            where: { question_id: question.id }
          }),
          UserAnswer.count({
            where: { 
              question_id: question.id,
              is_correct: true
            }
          })
        ]);

        const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

        return {
          ...question.toJSON(),
          totalAttempts,
          correctAttempts,
          accuracy: Math.round(accuracy * 100) / 100
        };
      }));

      res.json({
        success: true,
        data: {
          questions: questionsWithStats,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch questions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Create question
   */
  async createQuestion(req, res) {
    try {
      const { testId } = req.params;
      const questionData = {
        ...req.body,
        test_id: testId,
        created_by: req.admin?.id,
        uuid: uuidv4()
      };

      // Verify test exists
      const test = await Test.findByPk(testId);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      const question = await Question.create(questionData);

      // Update test's total questions and marks
      const questionCount = await Question.count({
        where: { test_id: testId, is_active: true }
      });
      const totalMarks = await Question.sum('marks', {
        where: { test_id: testId, is_active: true }
      });

      await test.update({
        total_questions: questionCount,
        total_marks: totalMarks || 0
      });

      res.status(201).json({
        success: true,
        message: 'Question created successfully',
        data: question
      });
    } catch (error) {
      console.error('Error creating question:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create question',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Update question
   */
  async updateQuestion(req, res) {
    try {
      const { questionId } = req.params;
      const updateData = req.body;

      const question = await Question.findByPk(questionId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      await question.update(updateData);

      // Update test totals if marks changed
      if (updateData.marks !== undefined) {
        const test = await Test.findByPk(question.test_id);
        const totalMarks = await Question.sum('marks', {
          where: { test_id: question.test_id, is_active: true }
        });
        
        await test.update({ total_marks: totalMarks || 0 });
      }

      res.json({
        success: true,
        message: 'Question updated successfully',
        data: question
      });
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update question',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Delete question
   */
  async deleteQuestion(req, res) {
    try {
      const { questionId } = req.params;

      const question = await Question.findByPk(questionId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      // Check if question has been attempted
      const attemptCount = await UserAnswer.count({
        where: { question_id: questionId }
      });

      if (attemptCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete question. It has ${attemptCount} attempt(s) by users.`
        });
      }

      const testId = question.test_id;
      await question.destroy();

      // Update test totals
      const test = await Test.findByPk(testId);
      const questionCount = await Question.count({
        where: { test_id: testId, is_active: true }
      });
      const totalMarks = await Question.sum('marks', {
        where: { test_id: testId, is_active: true }
      });

      await test.update({
        total_questions: questionCount,
        total_marks: totalMarks || 0
      });

      res.json({
        success: true,
        message: 'Question deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete question',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ============= MISSING METHODS =============

  /**
   * Update exam category
   */
  async updateExamCategory(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const category = await ExamCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Update hierarchy path if parent changed
      if (updateData.parent_id !== undefined) {
        let hierarchy_path = `/${id}`;
        if (updateData.parent_id) {
          const parentCategory = await ExamCategory.findByPk(updateData.parent_id);
          if (parentCategory) {
            hierarchy_path = `${parentCategory.hierarchy_path}/${id}`;
          }
        }
        updateData.hierarchy_path = hierarchy_path;
      }

      await category.update(updateData);

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Delete exam category
   */
  async deleteExamCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await ExamCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if category has child categories
      const childCount = await ExamCategory.count({
        where: { parent_id: id }
      });

      if (childCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. It has ${childCount} child categories.`
        });
      }

      // Check if category has test series
      const seriesCount = await TestSeries.count({
        where: { category_id: id }
      });

      if (seriesCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. It has ${seriesCount} test series.`
        });
      }

      await category.destroy();

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Get single test series by ID
   */
  async getTestSeriesById(req, res) {
    try {
      const { id } = req.params;

      const testSeries = await TestSeries.findByPk(id, {
        include: [
          {
            model: ExamCategory,
            as: 'category',
            attributes: ['id', 'name', 'name_gujarati']
          },
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          },
          {
            model: TestSeries,
            as: 'parentSeries',
            attributes: ['id', 'title', 'hierarchy_path']
          },
          {
            model: Admin,
            as: 'creator',
            attributes: ['id', 'name']
          },
          {
            model: Test,
            as: 'tests',
            where: { is_active: true },
            required: false,
            attributes: [
              'id', 'uuid', 'title', 'title_gujarati', 'test_type',
              'duration_minutes', 'total_questions', 'total_marks',
              'is_free', 'is_active', 'display_order'
            ],
            order: [['display_order', 'ASC']]
          }
        ]
      });

      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      // Get additional statistics
      const [testsCount, questionsCount, subscribersCount] = await Promise.all([
        Test.count({ where: { test_series_id: id, is_active: true } }),
        Question.count({
          include: [{
            model: Test,
            as: 'test',
            where: { test_series_id: id },
            attributes: []
          }]
        }),
        UserSubscription.count({
          where: { 
            test_series_id: id,
            status: 'active'
          }
        })
      ]);

      const result = {
        ...testSeries.toJSON(),
        actualTestsCount: testsCount,
        actualQuestionsCount: questionsCount,
        activeSubscribers: subscribersCount
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test series',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ============= ADDITIONAL MISSING METHODS =============

  /**
   * Toggle featured status
   */
  async toggleFeaturedStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_featured = true } = req.body;

      const testSeries = await TestSeries.findByPk(id);
      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      await testSeries.update({ is_featured });

      res.json({
        success: true,
        message: `Test series ${is_featured ? 'featured' : 'unfeatured'} successfully`,
        data: {
          id: testSeries.id,
          is_featured
        }
      });
    } catch (error) {
      console.error('Error toggling featured status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update featured status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Bulk create questions
   */
  async bulkCreateQuestions(req, res) {
    try {
      const { testId } = req.params;
      const { questions } = req.body;

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Questions array is required'
        });
      }

      // Verify test exists
      const test = await Test.findByPk(testId);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      const createdQuestions = [];
      
      for (let i = 0; i < questions.length; i++) {
        const questionData = {
          ...questions[i],
          test_id: testId,
          created_by: req.admin?.id,
          uuid: uuidv4(),
          display_order: questions[i].display_order || (i + 1)
        };
        
        const question = await Question.create(questionData);
        createdQuestions.push(question);
      }

      // Update test totals
      const questionCount = await Question.count({
        where: { test_id: testId, is_active: true }
      });
      const totalMarks = await Question.sum('marks', {
        where: { test_id: testId, is_active: true }
      });

      await test.update({
        total_questions: questionCount,
        total_marks: totalMarks || 0
      });

      res.status(201).json({
        success: true,
        message: `${createdQuestions.length} questions created successfully`,
        data: createdQuestions
      });
    } catch (error) {
      console.error('Error bulk creating questions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create questions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Placeholder methods for analytics (to be implemented)
   */
  async getTestSeriesAnalytics(req, res) {
    res.status(501).json({
      success: false,
      message: 'Analytics feature coming soon'
    });
  },

  async getTestAnalytics(req, res) {
    res.status(501).json({
      success: false,
      message: 'Analytics feature coming soon'
    });
  },

  async getQuestionAnalytics(req, res) {
    res.status(501).json({
      success: false,
      message: 'Analytics feature coming soon'
    });
  },

  async getTestSessions(req, res) {
    res.status(501).json({
      success: false,
      message: 'Session management feature coming soon'
    });
  },

  async getSessionDetails(req, res) {
    res.status(501).json({
      success: false,
      message: 'Session details feature coming soon'
    });
  },

  async getSeriesSubscriptions(req, res) {
    res.status(501).json({
      success: false,
      message: 'Subscription management feature coming soon'
    });
  },

  async createManualSubscription(req, res) {
    res.status(501).json({
      success: false,
      message: 'Manual subscription feature coming soon'
    });
  },

  async updateSubscription(req, res) {
    res.status(501).json({
      success: false,
      message: 'Subscription update feature coming soon'
    });
  },

  async cancelSubscription(req, res) {
    res.status(501).json({
      success: false,
      message: 'Subscription cancellation feature coming soon'
    });
  },

  // ============= STATISTICS & ANALYTICS =============

  /**
   * Get test series statistics
   */
  async getTestSeriesStats(req, res) {
    try {
      const totalSeries = await TestSeries.count({ where: { is_active: true } });
      const publishedSeries = await TestSeries.count({ 
        where: { is_active: true, is_published: true } 
      });
      const totalTests = await Test.count({ where: { is_active: true } });
      const totalQuestions = await Question.count({ where: { is_active: true } });

      res.json({
        success: true,
        data: {
          total_series: totalSeries,
          published_series: publishedSeries,
          total_tests: totalTests,
          total_questions: totalQuestions
        }
      });
    } catch (error) {
      console.error('Error fetching test series stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test series statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(req, res) {
    try {
      const { 
        dateRange = '30d', 
        category = '', 
        minScore = 0, 
        maxScore = 100 
      } = req.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const whereConditions = {
        created_at: {
          [Op.between]: [startDate, endDate]
        },
        percentage: {
          [Op.between]: [minScore, maxScore]
        }
      };

      // Get test sessions with analytics
      const sessions = await TestSession.findAll({
        where: whereConditions,
        include: [
          {
            model: Test,
            as: 'test',
            attributes: ['id', 'title', 'test_series_id']
          },
          {
            model: User,
            as: 'user',
            attributes: ['uuid', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 100
      });

      // Calculate statistics
      const totalAttempts = sessions.length;
      const averageScore = sessions.length > 0 ? 
        sessions.reduce((sum, s) => sum + (s.percentage || 0), 0) / sessions.length : 0;
      
      const scoreDistribution = {
        'excellent': sessions.filter(s => (s.percentage || 0) >= 80).length,
        'good': sessions.filter(s => (s.percentage || 0) >= 60 && (s.percentage || 0) < 80).length,
        'average': sessions.filter(s => (s.percentage || 0) >= 40 && (s.percentage || 0) < 60).length,
        'poor': sessions.filter(s => (s.percentage || 0) < 40).length
      };

      res.json({
        success: true,
        data: {
          total_attempts: totalAttempts,
          average_score: Math.round(averageScore * 100) / 100,
          score_distribution: scoreDistribution,
          recent_sessions: sessions.slice(0, 20).map(session => ({
            id: session.id,
            user_name: session.user?.name || 'Unknown',
            user_email: session.user?.email || 'N/A',
            test_title: session.test?.title || 'Unknown Test',
            score: session.percentage || 0,
            completed_at: session.completed_at,
            duration: session.total_time_spent || 0
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching performance analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch performance analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = testManagementController;