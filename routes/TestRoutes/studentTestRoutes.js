const express = require('express');
const router = express.Router();
const { 
  TestSeries, 
  Category, 
  SubCategory, 
  Test, 
  Question,
  TestSession,
  UserAnswer,
  User,
  Subscription,
  sequelize 
} = require('../../models');
const AuthToken = require('../../utils/AuthToken');

// Middleware to verify user authentication (optional for some endpoints)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = AuthToken.verifyToken(token);
      const user = await User.findByPk(decoded.userId);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next(); // Continue without auth for public endpoints
  }
};

const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = AuthToken.verifyToken(token);
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Middleware to check if user has access to a test
const checkTestAccess = async (req, res, next) => {
  try {
    const test = await Test.findOne({
      where: { uuid: req.params.uuid, is_active: true },
      include: [{
        model: SubCategory,
        include: [{
          model: Category,
          include: [{
            model: TestSeries
          }]
        }]
      }]
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const testSeries = test.SubCategory.Category.TestSeries;
    
    // If it's a free test series, allow access
    if (testSeries.pricing_type === 'free' || testSeries.is_free) {
      req.test = test;
      req.testSeries = testSeries;
      return next();
    }

    // Check if user has subscription
    const subscription = await Subscription.findOne({
      where: {
        user_id: req.user.uuid,
        test_series_id: testSeries.id,
        status: 'completed',
        [sequelize.Op.or]: [
          { expiry_date: null },
          { expiry_date: { [sequelize.Op.gt]: new Date() } }
        ]
      }
    });

    if (subscription) {
      req.test = test;
      req.testSeries = testSeries;
      req.subscription = subscription;
      return next();
    }

    // Check if this is a demo test access
    const demoTestsUsed = await TestSession.count({
      where: {
        user_id: req.user.id,
        test_id: {
          [sequelize.Op.in]: sequelize.literal(`(
            SELECT t.id FROM tests t
            JOIN sub_categories sc ON t.sub_category_id = sc.id
            JOIN categories c ON sc.category_id = c.id
            WHERE c.test_series_id = ${testSeries.id}
          )`)
        },
        is_demo: true
      }
    });

    const demoTestsRemaining = Math.max(0, (testSeries.demo_tests_count || 0) - demoTestsUsed);

    if (demoTestsRemaining > 0) {
      req.test = test;
      req.testSeries = testSeries;
      req.isDemo = true;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Subscription required to access this test',
      data: {
        requires_subscription: true,
        test_series_id: testSeries.uuid,
        test_series_name: testSeries.name,
        price: testSeries.price,
        demo_tests_used: demoTestsUsed,
        demo_tests_available: testSeries.demo_tests_count || 0
      }
    });
  } catch (error) {
    console.error('Error checking test access:', error);
    return res.status(500).json({ success: false, message: 'Failed to check test access' });
  }
};

// Get all test series (with pagination and filters)
router.get('/test-series', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      pricing_type,
      is_featured
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { is_active: true };

    if (search) {
      where[sequelize.Op.or] = [
        { name: { [sequelize.Op.like]: `%${search}%` } },
        { name_gujarati: { [sequelize.Op.like]: `%${search}%` } },
        { description: { [sequelize.Op.like]: `%${search}%` } },
        { description_gujarati: { [sequelize.Op.like]: `%${search}%` } }
      ];
    }

    if (pricing_type) {
      where.pricing_type = pricing_type;
    }

    if (is_featured !== undefined) {
      where.is_featured = is_featured === 'true';
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
      ],
    });

    // Add counts and subscription info
    const testSeriesWithMeta = await Promise.all(
      rows.map(async (series) => {
        const categories_count = await Category.count({
          where: { test_series_id: series.id, is_active: true }
        });

        const tests_count = await Test.count({
          include: [{
            model: SubCategory,
            include: [{
              model: Category,
              where: { test_series_id: series.id }
            }]
          }]
        });

        // Check subscription status if user is authenticated
        let is_subscribed = false;
        if (req.user && series.pricing_type === 'paid') {
          const subscription = await Subscription.findOne({
            where: {
              user_id: req.user.uuid,
              test_series_id: series.id,
              status: 'completed',
              [sequelize.Op.or]: [
                { expiry_date: null },
                { expiry_date: { [sequelize.Op.gt]: new Date() } }
              ]
            }
          });
          is_subscribed = !!subscription;
        }

        return {
          ...series.toJSON(),
          categories_count,
          tests_count,
          is_subscribed
        };
      })
    );

    res.json({
      success: true,
      data: testSeriesWithMeta,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching test series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test series',
      error: error.message
    });
  }
});

// Get single test series by UUID
router.get('/test-series/:uuid', optionalAuth, async (req, res) => {
  try {
    const testSeries = await TestSeries.findOne({
      where: { uuid: req.params.uuid, is_active: true }
    });

    if (!testSeries) {
      return res.status(404).json({
        success: false,
        message: 'Test series not found'
      });
    }

    // Add counts
    const categories_count = await Category.count({
      where: { test_series_id: testSeries.id, is_active: true }
    });

    const tests_count = await Test.count({
      include: [{
        model: SubCategory,
        include: [{
          model: Category,
          where: { test_series_id: testSeries.id }
        }]
      }]
    });

    res.json({
      success: true,
      data: {
        ...testSeries.toJSON(),
        categories_count,
        tests_count
      }
    });
  } catch (error) {
    console.error('Error fetching test series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test series',
      error: error.message
    });
  }
});

// Get categories for a test series
router.get('/test-series/:uuid/categories', optionalAuth, async (req, res) => {
  try {
    const testSeries = await TestSeries.findOne({
      where: { uuid: req.params.uuid, is_active: true }
    });

    if (!testSeries) {
      return res.status(404).json({
        success: false,
        message: 'Test series not found'
      });
    }

    const categories = await Category.findAll({
      where: { 
        test_series_id: testSeries.id,
        is_active: true 
      },
      order: [['created_at', 'ASC']]
    });

    // Add counts for each category
    const categoriesWithMeta = await Promise.all(
      categories.map(async (category) => {
        const sub_categories_count = await SubCategory.count({
          where: { category_id: category.id, is_active: true }
        });

        const tests_count = await Test.count({
          include: [{
            model: SubCategory,
            where: { category_id: category.id }
          }]
        });

        return {
          ...category.toJSON(),
          sub_categories_count,
          tests_count
        };
      })
    );

    res.json({
      success: true,
      data: categoriesWithMeta
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Get single category by UUID
router.get('/categories/:uuid', optionalAuth, async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { uuid: req.params.uuid, is_active: true }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
});

// Get sub-categories for a category
router.get('/categories/:uuid/sub-categories', optionalAuth, async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { uuid: req.params.uuid, is_active: true }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subCategories = await SubCategory.findAll({
      where: { 
        category_id: category.id,
        is_active: true 
      },
      order: [['created_at', 'ASC']]
    });

    // Add test counts
    const subCategoriesWithMeta = await Promise.all(
      subCategories.map(async (subCategory) => {
        const tests_count = await Test.count({
          where: { sub_category_id: subCategory.id, is_active: true }
        });

        return {
          ...subCategory.toJSON(),
          tests_count
        };
      })
    );

    res.json({
      success: true,
      data: subCategoriesWithMeta
    });
  } catch (error) {
    console.error('Error fetching sub-categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-categories',
      error: error.message
    });
  }
});

// Get single sub-category by UUID
router.get('/sub-categories/:uuid', optionalAuth, async (req, res) => {
  try {
    const subCategory = await SubCategory.findOne({
      where: { uuid: req.params.uuid, is_active: true }
    });

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: 'Sub-category not found'
      });
    }

    res.json({
      success: true,
      data: subCategory
    });
  } catch (error) {
    console.error('Error fetching sub-category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-category',
      error: error.message
    });
  }
});

// Get tests for a sub-category
router.get('/sub-categories/:uuid/tests', optionalAuth, async (req, res) => {
  try {
    const subCategory = await SubCategory.findOne({
      where: { uuid: req.params.uuid, is_active: true }
    });

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: 'Sub-category not found'
      });
    }

    const tests = await Test.findAll({
      where: { 
        sub_category_id: subCategory.id,
        is_active: true 
      },
      order: [['created_at', 'ASC']]
    });

    // Add question counts and user attempt info
    const testsWithMeta = await Promise.all(
      tests.map(async (test) => {
        const questions_count = await Question.count({
          where: { test_id: test.id, is_active: true }
        });

        let user_attempts = 0;
        if (req.user) {
          user_attempts = await TestSession.count({
            where: { 
              user_id: req.user.id,
              test_id: test.id,
              status: 'completed'
            }
          });
        }

        return {
          ...test.toJSON(),
          questions_count,
          user_attempts
        };
      })
    );

    res.json({
      success: true,
      data: testsWithMeta
    });
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message
    });
  }
});

// Get single test by UUID
router.get('/tests/:uuid', optionalAuth, async (req, res) => {
  try {
    const test = await Test.findOne({
      where: { uuid: req.params.uuid, is_active: true }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    const questions_count = await Question.count({
      where: { test_id: test.id, is_active: true }
    });

    res.json({
      success: true,
      data: {
        ...test.toJSON(),
        questions_count
      }
    });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test',
      error: error.message
    });
  }
});

// Get questions for a test (requires authentication and subscription)
router.get('/tests/:uuid/questions', requireAuth, checkTestAccess, async (req, res) => {
  try {
    const test = req.test; // From checkTestAccess middleware

    const questions = await Question.findAll({
      where: { 
        test_id: test.id,
        is_active: true 
      },
      order: [['id', 'ASC']],
      attributes: [
        'id', 'uuid', 'question_text', 'question_text_gujarati',
        'question_type', 'option_a', 'option_b', 'option_c', 'option_d',
        'option_a_gujarati', 'option_b_gujarati', 'option_c_gujarati', 'option_d_gujarati',
        'marks', 'difficulty_level', 'created_at'
        // Note: correct_answer and explanation are excluded for security
      ]
    });

    res.json({
      success: true,
      data: {
        questions,
        test_info: {
          id: test.id,
          uuid: test.uuid,
          title: test.title,
          duration_minutes: test.duration_minutes,
          total_marks: test.total_marks,
          is_demo: req.isDemo || false
        }
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message
    });
  }
});

// Check subscription access for a test series
router.get('/test-series/:uuid/subscription-access', requireAuth, async (req, res) => {
  try {
    const testSeries = await TestSeries.findOne({
      where: { uuid: req.params.uuid, is_active: true }
    });

    if (!testSeries) {
      return res.status(404).json({
        success: false,
        message: 'Test series not found'
      });
    }

    // If it's a free test series, everyone has access
    if (testSeries.pricing_type === 'free') {
      return res.json({
        success: true,
        data: {
          has_access: true,
          subscription_type: 'free',
          can_access_demo: true,
          demo_tests_remaining: testSeries.demo_tests_count || 0
        }
      });
    }

    // For paid test series, check subscription
    const subscription = await Subscription.findOne({
      where: {
        user_id: req.user.uuid,
        test_series_id: testSeries.id,
        status: 'completed',
        [sequelize.Op.or]: [
          { expiry_date: null },
          { expiry_date: { [sequelize.Op.gt]: new Date() } }
        ]
      }
    });

    if (subscription) {
      return res.json({
        success: true,
        data: {
          has_access: true,
          subscription_type: 'paid',
          expires_at: subscription.expiry_date,
          purchase_date: subscription.purchase_date,
          can_access_demo: true,
          demo_tests_remaining: 0
        }
      });
    }

    // Check if user has already used demo tests
    const demoTestsUsed = await TestSession.count({
      where: {
        user_id: req.user.id,
        test_id: {
          [sequelize.Op.in]: sequelize.literal(`(
            SELECT t.id FROM tests t
            JOIN sub_categories sc ON t.sub_category_id = sc.id
            JOIN categories c ON sc.category_id = c.id
            WHERE c.test_series_id = ${testSeries.id}
          )`)
        },
        is_demo: true
      }
    });

    const demoTestsRemaining = Math.max(0, (testSeries.demo_tests_count || 0) - demoTestsUsed);

    res.json({
      success: true,
      data: {
        has_access: false,
        subscription_type: null,
        expires_at: null,
        can_access_demo: demoTestsRemaining > 0,
        demo_tests_remaining: demoTestsRemaining,
        demo_tests_used: demoTestsUsed
      }
    });
  } catch (error) {
    console.error('Error checking subscription access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription access',
      error: error.message
    });
  }
});

// Start a test session
router.post('/tests/:uuid/start', requireAuth, checkTestAccess, async (req, res) => {
  try {
    const test = req.test;

    // Check if user already has an active session for this test
    const existingSession = await TestSession.findOne({
      where: {
        user_id: req.user.id,
        test_id: test.id,
        status: ['in_progress', 'paused']
      }
    });

    if (existingSession) {
      return res.json({
        success: true,
        data: {
          session_id: existingSession.uuid,
          status: existingSession.status,
          started_at: existingSession.start_time,
          time_remaining: existingSession.time_remaining,
          is_resuming: true
        }
      });
    }

    // Create new test session
    const session = await TestSession.create({
      user_id: req.user.id,
      test_id: test.id,
      start_time: new Date(),
      status: 'in_progress',
      is_demo: req.isDemo || false,
      time_remaining: test.duration_minutes * 60 // Convert to seconds
    });

    res.json({
      success: true,
      data: {
        session_id: session.uuid,
        status: session.status,
        started_at: session.start_time,
        time_remaining: session.time_remaining,
        is_demo: session.is_demo
      }
    });
  } catch (error) {
    console.error('Error starting test session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start test session',
      error: error.message
    });
  }
});

module.exports = router;