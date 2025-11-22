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
      } else {
        // Exclude PYQs from default listing (show only free and paid)
        where.pricing_type = {
          [Op.ne]: 'previous_years_question_papers'
        };
      }

      const { count, rows } = await TestSeries.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'is_active', 'pricing_type', 'price', 'currency',
          'discount_percentage', 'is_featured',
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
          'is_active', 'pricing_type', 'price', 'currency',
          'discount_percentage', 'is_featured',
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
          'is_active', 'pricing_type', 'price', 'currency',
          'discount_percentage', 'is_featured',
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
          order = [['ASC'], ['created_at', 'DESC']];
          break;
        case 'long':
          order = [['DESC'], ['created_at', 'DESC']];
          break;
      }

      const freeTests = await TestSeries.findAll({
        where,
        limit: parseInt(limit),
        order,
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'is_active', 'pricing_type', 'price', 'currency',
          'discount_percentage', 'is_featured',
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
              as: 'category',
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

  // Get Previous Years Question Papers (pricing_type = 'previous_years_question_papers')
  static async getPreviousYearsTests(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        difficulty,
        sort = 'newest',
        is_featured
      } = req.query;
      const userId = req.user?.id;

      const offset = (page - 1) * limit;
      const where = {
        is_active: true,
        pricing_type: 'previous_years_question_papers' // Only PYQ tests
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

      // Add featured filter if provided
      if (is_featured === 'true' || is_featured === true) {
        where.is_featured = true;
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
      }

      const { count, rows: pyqTests } = await TestSeries.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'is_active', 'pricing_type', 'price', 'currency',
          'discount_percentage', 'is_featured',
          'difficulty_level', 'created_at', 'updated_at'
        ]
      });

      // Transform data to match frontend expectations
      const transformedTests = await Promise.all(
        pyqTests.map(async (test) => {
          // Count categories/tests for this PYQ series
          const categoriesCount = await Category.count({
            where: {
              test_series_id: test.id,
              is_active: true
            }
          });

          // Count total questions
          const questionsCount = await Question.count({
            include: [{
              model: Category,
              as: 'category',
              where: {
                test_series_id: test.id,
                is_active: true
              },
              required: true
            }]
          });

          return {
            id: test.id,
            uuid: test.uuid,
            title: test.name,
            name: test.name,
            description: test.description,
            name_gujarati: test.name_gujarati,
            description_gujarati: test.description_gujarati,
            difficulty_level: test.difficulty_level || 'intermediate',
            total_tests: categoriesCount,
            total_questions: questionsCount || 0,
            estimated_duration: 120, // Default 2 hours for PYQ papers
            is_active: test.is_active,
            is_featured: test.is_featured,
            hasAccess: true, // PYQs are free to access
            created_at: test.created_at,
            updated_at: test.updated_at
          };
        })
      );

      res.json({
        success: true,
        message: 'Previous years question papers retrieved successfully',
        data: {
          tests: transformedTests,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: parseInt(limit),
            hasMore: count > (page * limit)
          }
        }
      });

    } catch (error) {
      console.error('Get previous years tests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve previous years question papers'
      });
    }
  }

  // Helper method to build hierarchy path for a category
  static async buildHierarchyPath(categoryId) {
    try {
      const path = [];
      let currentCategory = await Category.findByPk(categoryId, {
        attributes: ['id', 'uuid', 'name', 'name_gujarati', 'node_type', 'parent_category_id']
      });

      let iterations = 0;
      const maxIterations = 10; // Prevent infinite loops

      while (currentCategory && iterations < maxIterations) {
        path.unshift({
          uuid: currentCategory.uuid,
          name: currentCategory.name,
          name_gujarati: currentCategory.name_gujarati,
          node_type: currentCategory.node_type
        });

        if (currentCategory.parent_category_id) {
          currentCategory = await Category.findByPk(currentCategory.parent_category_id, {
            attributes: ['id', 'uuid', 'name', 'name_gujarati', 'node_type', 'parent_category_id']
          });
        } else {
          currentCategory = null;
        }

        iterations++;
      }

      return path;
    } catch (error) {
      console.error('Error building hierarchy path:', error);
      return [{
        uuid: categoryId,
        name: 'Unknown',
        name_gujarati: 'Unknown',
        node_type: 'question_holder'
      }];
    }
  }

  // Get all PAID test series that have at least one free category
  static async getFreeInPaidSeries(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // Find all paid test series that have at least one free category
      const paidSeriesWithFreeCategories = await TestSeries.findAll({
        where: {
          is_active: true,
          pricing_type: 'paid'
        },
        include: [{
          model: Category,
          as: 'categories',
          where: {
            is_active: true,
            node_type: 'question_holder',
            is_free_in_paid_series: true
          },
          attributes: ['id'],
          required: true // Only include series that have free categories
        }],
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'pricing_type', 'price', 'currency', 'is_featured', 'created_at'
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      // Count total paid series with free categories
      const totalCount = await TestSeries.count({
        where: {
          is_active: true,
          pricing_type: 'paid'
        },
        include: [{
          model: Category,
          as: 'categories',
          where: {
            is_active: true,
            node_type: 'question_holder',
            is_free_in_paid_series: true
          },
          required: true
        }],
        distinct: true
      });

      // Transform the data and count free categories
      const seriesWithFreeCounts = await Promise.all(
        paidSeriesWithFreeCategories.map(async (series) => {
          const freeCategoriesCount = await Category.count({
            where: {
              test_series_id: series.id,
              is_active: true,
              node_type: 'question_holder',
              is_free_in_paid_series: true
            }
          });

          return {
            uuid: series.uuid,
            title: series.name,
            title_gujarati: series.name_gujarati,
            description: series.description,
            description_gujarati: series.description_gujarati,
            is_paid: true,
            price: series.price,
            currency: series.currency,
            is_featured: series.is_featured,
            free_categories_count: freeCategoriesCount
          };
        })
      );

      res.json({
        success: true,
        message: 'Paid test series with free categories retrieved successfully',
        data: {
          series: seriesWithFreeCounts,
          pagination: {
            total: totalCount,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get free in paid series error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve paid series with free categories'
      });
    }
  }

  // Get free categories for a specific paid series with hierarchy paths
  static async getFreeInPaidCategories(req, res) {
    try {
      const { seriesUuid } = req.params;

      // Find the test series
      const series = await TestSeries.findOne({
        where: {
          uuid: seriesUuid,
          is_active: true,
          pricing_type: 'paid'
        },
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'pricing_type', 'price', 'currency'
        ]
      });

      if (!series) {
        return res.status(404).json({
          success: false,
          message: 'Paid test series not found'
        });
      }

      // Get all free question-holder categories for this series
      const freeCategories = await Category.findAll({
        where: {
          test_series_id: series.id,
          is_active: true,
          node_type: 'question_holder',
          is_free_in_paid_series: true
        },
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'node_type', 'hierarchy_level', 'test_duration_minutes',
          'negative_marking_enabled', 'negative_marks_per_wrong'
        ],
        order: [['hierarchy_level', 'ASC'], ['name', 'ASC']]
      });

      // Build hierarchy paths and get questions count for each category
      const categoriesWithPaths = await Promise.all(
        freeCategories.map(async (category) => {
          const hierarchyPath = await this.buildHierarchyPath(category.id);

          const questionsCount = await Question.count({
            where: {
              category_id: category.id,
              is_active: true
            }
          });

          return {
            uuid: category.uuid,
            name: category.name,
            name_gujarati: category.name_gujarati,
            description: category.description,
            description_gujarati: category.description_gujarati,
            node_type: category.node_type,
            hierarchy_level: category.hierarchy_level,
            test_duration_minutes: category.test_duration_minutes,
            negative_marking_enabled: category.negative_marking_enabled,
            negative_marks_per_wrong: category.negative_marks_per_wrong,
            questions_count: questionsCount,
            hierarchy_path: hierarchyPath
          };
        })
      );

      res.json({
        success: true,
        message: 'Free categories retrieved successfully',
        data: {
          series: {
            uuid: series.uuid,
            title: series.name,
            title_gujarati: series.name_gujarati,
            description: series.description,
            description_gujarati: series.description_gujarati,
            is_paid: true,
            price: series.price,
            currency: series.currency
          },
          freeCategories: categoriesWithPaths
        }
      });

    } catch (error) {
      console.error('Get free categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve free categories'
      });
    }
  }

  // Get all free categories from ALL paid series (aggregated for main discovery page)
  static async getAllFreeInPaidCategories(req, res) {
    try {
      const { page = 1, limit = 12 } = req.query;
      const offset = (page - 1) * limit;

      // Get all free categories from paid series with series info
      const freeCategories = await Category.findAll({
        where: {
          is_active: true,
          node_type: 'question_holder',
          is_free_in_paid_series: true
        },
        include: [{
          model: TestSeries,
          as: 'testSeries',
          where: {
            is_active: true,
            pricing_type: 'paid'
          },
          attributes: ['id', 'uuid', 'name', 'name_gujarati', 'price', 'currency'],
          required: true
        }],
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'test_duration_minutes', 'negative_marking_enabled', 'negative_marks_per_wrong'
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      // Count total free categories in paid series
      const totalCount = await Category.count({
        where: {
          is_active: true,
          node_type: 'question_holder',
          is_free_in_paid_series: true
        },
        include: [{
          model: TestSeries,
          as: 'testSeries',
          where: {
            is_active: true,
            pricing_type: 'paid'
          },
          required: true
        }]
      });

      // Build response with hierarchy paths and metadata
      const categoriesWithMetadata = await Promise.all(freeCategories.map(async (category) => {
        // Build breadcrumb: Series Name → Category Name
        const breadcrumb = `${category.testSeries.name} → ${category.name}`;
        const breadcrumbGujarati = category.testSeries.name_gujarati && category.name_gujarati
          ? `${category.testSeries.name_gujarati} → ${category.name_gujarati}`
          : breadcrumb;

        // Count actual questions for this category
        const questionsCount = await Question.count({
          where: {
            category_id: category.id,
            is_active: true
          }
        });

        return {
          uuid: category.uuid,
          name: category.name,
          name_gujarati: category.name_gujarati,
          description: category.description,
          description_gujarati: category.description_gujarati,
          test_duration_minutes: category.test_duration_minutes,
          questions_count: questionsCount,
          difficulty_level: 'medium', // Default, can be added to Category model later
          series: {
            uuid: category.testSeries.uuid,
            title: category.testSeries.name,
            title_gujarati: category.testSeries.name_gujarati,
            price: category.testSeries.price,
            currency: category.testSeries.currency
          },
          hierarchy_path: [
            {
              uuid: category.testSeries.uuid,
              name: category.testSeries.name,
              name_gujarati: category.testSeries.name_gujarati,
              node_type: 'test_series'
            },
            {
              uuid: category.uuid,
              name: category.name,
              name_gujarati: category.name_gujarati,
              node_type: 'question_holder'
            }
          ],
          breadcrumb: breadcrumb,
          breadcrumb_gujarati: breadcrumbGujarati
        };
      }));

      res.json({
        success: true,
        message: 'All free categories from paid series retrieved successfully',
        data: {
          categories: categoriesWithMetadata,
          pagination: {
            total: totalCount,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get all free in paid categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve free categories'
      });
    }
  }

  // Get enrolled test series (user's purchased series)
  static async getEnrolledSeries(req, res) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      // const userId = req.user?.id;
      const userUuid = req.user.uuid;

      if (!userUuid) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const offset = (page - 1) * limit;

      // Find all active subscriptions for the user
      const subscriptions = await Subscription.findAll({
        where: {
          user_id: userUuid,
          status: 'completed',
          [Op.or]: [
            { expiry_date: null },
            { expiry_date: { [Op.gt]: new Date() } }
          ]
        },
        attributes: ['test_series_id', 'created_at', 'expiry_date']
      });

      if (subscriptions.length === 0) {
        return res.json({
          success: true,
          message: 'No enrolled test series found',
          data: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0
          }
        });
      }

      // Extract test series IDs
      const testSeriesIds = subscriptions.map(sub => sub.test_series_id);

      // Build where clause for test series
      const where = {
        id: { [Op.in]: testSeriesIds },
        is_active: true
      };

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { name_gujarati: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { description_gujarati: { [Op.like]: `%${search}%` } }
        ];
      }

      // Get enrolled test series with pagination
      const { count, rows } = await TestSeries.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        attributes: [
          'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
          'is_active', 'pricing_type', 'price', 'currency',
          'discount_percentage', 'is_featured',
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
              is_active: true,
              node_type: 'question_holder'
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

          // Get subscription details
          const subscription = subscriptions.find(sub => sub.test_series_id === series.id);

          return {
            id: series.id,
            uuid: series.uuid,
            name: series.name,
            title: series.name,
            description: series.description,
            pricing_type: series.pricing_type,
            price: series.price,
            currency: series.currency,
            discount_percentage: series.discount_percentage,
            is_featured: series.is_featured,
            tests_count: categoriesCount,
            total_tests: categoriesCount,
            total_questions: totalQuestions,
            is_purchased: true,
            is_subscribed: true,
            enrolled_at: subscription?.created_at,
            expiry_date: subscription?.expiry_date
          };
        })
      );

      res.json({
        success: true,
        message: 'Enrolled test series retrieved successfully',
        data: testSeriesWithMeta,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get enrolled series error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve enrolled test series'
      });
    }
  }
}

module.exports = TestSeriesController;