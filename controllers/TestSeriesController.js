const { Sequelize, Op } = require('sequelize');
const { TestSeries, Category, Question, User, Subscription } = require('../models');

class TestSeriesController {
  // Get all test series (for web app tests page)
  static async getTestSeries(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category,
        search,
        pricing_type 
      } = req.query;
      const userId = req.user?.id;

      const offset = (page - 1) * limit;
      const where = { is_active: true };

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { name_gujarati: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { description_gujarati: { [Op.like]: `%${search}%` } }
        ];
      }

      if (pricing_type) {
        where.pricing_type = pricing_type;
      }

      const { count, rows } = await TestSeries.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'is_active', 'pricing_type', 'price', 'currency', 'demo_tests_count',
          'subscription_duration_days', 'discount_percentage', 'is_featured',
          'created_at', 'updated_at'
        ]
      });

      // Transform data to match web app format
      const testSeriesWithMeta = await Promise.all(
        rows.map(async (series) => {
          // Count categories (representing test groups)
          const categoriesCount = await Category.count({
            where: { 
              test_series_id: series.id, 
              is_active: true 
            }
          });

          // Count total questions across all categories
          const totalQuestions = await Question.count({
            include: [{
              model: Category,
              as: 'category',
              where: { 
                test_series_id: series.id, 
                is_active: true 
              },
              required: true
            }]
          });

          // Check subscription status
          let hasAccess = series.pricing_type === 'free';
          let completedTests = 0;

          if (userId) {
            if (series.pricing_type === 'paid') {
              const subscription = await Subscription.findOne({
                where: {
                  user_id: userId,
                  test_series_id: series.id,
                  status: 'completed',
                  [Op.or]: [
                    { expiry_date: null },
                    { expiry_date: { [Op.gt]: new Date() } }
                  ]
                }
              });
              hasAccess = !!subscription;
            }

            // TODO: Calculate completed tests from user session data
            // For now, generate a random number for demo purposes
            completedTests = Math.floor(Math.random() * Math.min(categoriesCount, 5));
          }

          return {
            id: series.id,
            title: series.name,
            description: series.description,
            totalTests: categoriesCount,
            completedTests: completedTests,
            isPremium: series.pricing_type === 'paid',
            hasAccess: hasAccess,
            category: 'competitive', // Default category
            estimatedTime: 120, // Default time in minutes
            price: series.price,
            currency: series.currency,
            isFeatured: series.is_featured,
            uuid: series.uuid
          };
        })
      );

      res.json({
        success: true,
        message: 'Test series retrieved successfully',
        data: testSeriesWithMeta,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Test series error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get single test series details
  static async getTestSeriesDetails(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const series = await TestSeries.findOne({
        where: { 
          [Op.or]: [
            { id: parseInt(id) || 0 },
            { uuid: id }
          ],
          is_active: true 
        },
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'is_active', 'pricing_type', 'price', 'currency', 'demo_tests_count',
          'subscription_duration_days', 'discount_percentage', 'is_featured',
          'created_at', 'updated_at'
        ]
      });

      if (!series) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      // Get categories (representing test groups)
      const categories = await Category.findAll({
        where: {
          test_series_id: series.id,
          is_active: true,
          parent_category_id: null // Only root categories
        },
        order: [['display_order', 'ASC'], ['name', 'ASC']],
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'node_type', 'hierarchy_level', 'display_order', 'created_at', 'updated_at'
        ]
      });

      // Add metadata for each category
      const categoriesWithMeta = await Promise.all(
        categories.map(async (category) => {
          const subcategoriesCount = await Category.count({
            where: { 
              parent_category_id: category.id, 
              is_active: true 
            }
          });

          const questionsCount = await Question.count({
            where: { 
              category_id: category.id,
              is_active: true 
            }
          });

          return {
            id: category.id,
            uuid: category.uuid,
            title: category.name,
            description: category.description,
            questionsCount: questionsCount,
            subcategoriesCount: subcategoriesCount,
            hasQuestions: questionsCount > 0,
            hasSubcategories: subcategoriesCount > 0,
            estimatedTime: Math.max(questionsCount * 1.5, 30) // 1.5 minutes per question, minimum 30 mins
          };
        })
      );

      // Check subscription status
      let hasAccess = series.pricing_type === 'free';
      if (userId && series.pricing_type === 'paid') {
        const subscription = await Subscription.findOne({
          where: {
            user_id: userId,
            test_series_id: series.id,
            status: 'completed',
            [Op.or]: [
              { expiry_date: null },
              { expiry_date: { [Op.gt]: new Date() } }
            ]
          }
        });
        hasAccess = !!subscription;
      }

      const result = {
        id: series.id,
        uuid: series.uuid,
        title: series.name,
        description: series.description,
        isPremium: series.pricing_type === 'paid',
        hasAccess: hasAccess,
        price: series.price,
        currency: series.currency,
        isFeatured: series.is_featured,
        totalTests: categoriesWithMeta.length,
        categories: categoriesWithMeta,
        // Backwards compatibility
        tests: categoriesWithMeta
      };

      res.json({
        success: true,
        message: 'Test series details retrieved successfully',
        data: result
      });

    } catch (error) {
      console.error('Test series details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get featured test series (for homepage)
  static async getFeaturedTestSeries(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      
      const series = await TestSeries.findAll({
        where: { 
          is_active: true,
          is_featured: true 
        },
        limit: limit,
        order: [['created_at', 'DESC']],
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'is_active', 'pricing_type', 'price', 'currency', 'demo_tests_count',
          'subscription_duration_days', 'discount_percentage', 'is_featured',
          'created_at', 'updated_at'
        ]
      });

      const featuredSeries = await Promise.all(
        series.map(async (item) => {
          const categoriesCount = await Category.count({
            where: { 
              test_series_id: item.id, 
              is_active: true 
            }
          });

          return {
            id: item.id,
            uuid: item.uuid,
            title: item.name,
            description: item.description,
            totalTests: categoriesCount,
            isPremium: item.pricing_type === 'paid',
            price: item.price,
            currency: item.currency,
            isFeatured: true
          };
        })
      );

      res.json({
        success: true,
        message: 'Featured test series retrieved successfully',
        data: featuredSeries
      });

    } catch (error) {
      console.error('Featured test series error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get free tests (pricing_type = 'free')
  static async getFreeTests(req, res) {
    try {
      const {
        search,
        difficulty,
        category,
        sort = 'newest',
        limit = 50
      } = req.query;
      const userId = req.user?.id;

      const where = {
        is_active: true,
        pricing_type: 'free' // Only free tests
      };

      // Add search filter
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { name_gujarati: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { description_gujarati: { [Op.like]: `%${search}%` } }
        ];
      }

      // Add difficulty filter if provided
      if (difficulty && difficulty !== 'all') {
        where.difficulty_level = difficulty;
      }

      // Set up sorting
      let order = [['created_at', 'DESC']]; // default newest
      switch (sort) {
        case 'oldest':
          order = [['created_at', 'ASC']];
          break;
        case 'popular':
          order = [['is_featured', 'DESC'], ['created_at', 'DESC']];
          break;
        case 'easy':
          order = [
            [Sequelize.literal("CASE WHEN difficulty_level = 'beginner' THEN 1 WHEN difficulty_level = 'intermediate' THEN 2 ELSE 3 END"), 'ASC'],
            ['created_at', 'DESC']
          ];
          break;
        case 'hard':
          order = [
            [Sequelize.literal("CASE WHEN difficulty_level = 'advanced' THEN 1 WHEN difficulty_level = 'intermediate' THEN 2 ELSE 3 END"), 'ASC'],
            ['created_at', 'DESC']
          ];
          break;
        case 'short':
          order = [['subscription_duration_days', 'ASC'], ['created_at', 'DESC']];
          break;
        case 'long':
          order = [['subscription_duration_days', 'DESC'], ['created_at', 'DESC']];
          break;
      }

      const freeTests = await TestSeries.findAll({
        where,
        limit: parseInt(limit),
        order,
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'is_active', 'pricing_type', 'price', 'currency', 'demo_tests_count',
          'subscription_duration_days', 'discount_percentage', 'is_featured',
          'difficulty_level', 'created_at', 'updated_at'
        ]
      });

      // Transform data to match frontend expectations
      const transformedTests = await Promise.all(
        freeTests.map(async (test) => {
          // Count categories/questions for this test series
          const categoriesCount = await Category.count({
            where: { test_series_id: test.id }
          });

          // Count total questions
          const questionsCount = await Question.count({
            include: [{
              model: Category,
              where: { test_series_id: test.id },
              required: true
            }]
          });

          return {
            id: test.id,
            uuid: test.uuid,
            title: test.name,
            name: test.name,
            description: test.description,
            difficulty_level: test.difficulty_level || 'intermediate',
            duration_minutes: 60, // Default duration
            total_questions: questionsCount || 50, // Use actual count or default
            total_marks: questionsCount || 50, // Usually 1 mark per question
            category: category || 'general',
            subject: category || 'general',
            rating: 4.2 + (Math.random() * 0.8), // Random rating between 4.2-5.0
            attempts_count: Math.floor(Math.random() * 1000) + 100, // Random attempts
            is_active: test.is_active,
            is_featured: test.is_featured,
            created_at: test.created_at,
            // Additional computed fields
            timeLimit: '60 minutes',
            questionsCount: questionsCount || 50,
            category_name: category || 'General',
            hasAttempted: false, // TODO: Check user attempt history
            bestScore: null, // TODO: Get from user attempts
            lastAttemptDate: null // TODO: Get from user attempts
          };
        })
      );

      res.json({
        success: true,
        message: 'Free tests retrieved successfully',
        data: transformedTests
      });

    } catch (error) {
      console.error('Free tests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve free tests'
      });
    }
  }
}

module.exports = TestSeriesController;