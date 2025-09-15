const express = require('express');
const router = express.Router();
const { 
  TestSeries, 
  Category,
  Question,
  TestSession,
  UserAnswer,
  User,
  Subscription,
  sequelize,
  Sequelize
} = require('../../models');
const AuthToken = require('../../utils/AuthToken');
const { checkUserTestSeriesAccess } = require('../SubscriptionRoutes/subscriptionAccess');

// Middleware for optional authentication
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = AuthToken.verifyToken(token);
      // Handle both old 'id' and new 'uuid' field in JWT payload
      const userUuid = decoded.uuid || decoded.id;
      const user = await User.findOne({ where: { uuid: userUuid } });
      if (user) {
        req.user = {
          ...user.toJSON(),
          id: user.uuid,        // Use UUID as ID for consistency
          uuid: user.uuid
        };
      }
    }
    next();
  } catch (error) {
    next(); // Continue without auth for public endpoints
  }
};

// Middleware for required authentication  
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = AuthToken.verifyToken(token);
    // Handle both old 'id' and new 'uuid' field in JWT payload
    const userUuid = decoded.uuid || decoded.id;
    const user = await User.findOne({ where: { uuid: userUuid } });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = {
      ...user.toJSON(),
      id: user.uuid,        // Use UUID as ID for consistency
      uuid: user.uuid
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// =====================================================
// DYNAMIC HIERARCHY ENDPOINTS (Student-facing)
// =====================================================

// Get test series with new hierarchy (replaces old test-series listing)
router.get('/dynamic/test-series', optionalAuth, async (req, res) => {
  console.log('🔍 /dynamic/test-series route hit with user:', req.user ? req.user.uuid : 'no user');
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
      where[Sequelize.Op.or] = [
        { name: { [Sequelize.Op.like]: `%${search}%` } },
        { name_gujarati: { [Sequelize.Op.like]: `%${search}%` } },
        { description: { [Sequelize.Op.like]: `%${search}%` } },
        { description_gujarati: { [Sequelize.Op.like]: `%${search}%` } }
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

    // Add dynamic hierarchy counts and subscription info
    const testSeriesWithMeta = await Promise.all(
      rows.map(async (series) => {
        // Count root categories (new hierarchy)
        const categories_count = await Category.count({
          where: { 
            test_series_id: series.id, 
            is_active: true,
            parent_category_id: null // Only root categories
          }
        });

        // Count total questions across all categories
        const total_questions = await Question.count({
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

        // Check subscription if user is authenticated
        let is_subscribed = false;
        if (req.user) {
          const subscription = await Subscription.findOne({
            where: {
              user_id: req.user.uuid, // Use uuid instead of id
              test_series_id: series.id,
              status: 'completed', // Check status instead of is_active
              [Sequelize.Op.or]: [
                { expiry_date: null }, // No expiry (lifetime)
                { expiry_date: { [Sequelize.Op.gt]: new Date() } } // Not expired
              ]
            }
          });
          is_subscribed = !!subscription;
        }

        return {
          ...series.toJSON(),
          categories_count,
          total_questions,
          is_subscribed,
          // Backwards compatibility fields
          tests_count: total_questions > 0 ? 1 : 0, // Simplified for backwards compatibility
          title: series.name, // Map name to title for app compatibility
        };
      })
    );

    res.json({
      success: true,
      data: testSeriesWithMeta,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('❌ ERROR in /dynamic/test-series:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test series'
    });
  }
});

// Get test series details with root categories (replaces old test-series/:uuid)
router.get('/dynamic/test-series/:uuid', optionalAuth, async (req, res) => {
  try {
    const { uuid } = req.params;

    const series = await TestSeries.findOne({
      where: { uuid, is_active: true },
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

    // Get root categories for this series
    const rootCategories = await Category.findAll({
      where: {
        test_series_id: series.id,
        is_active: true,
        parent_category_id: null
      },
      order: [['display_order', 'ASC'], ['name', 'ASC']],
      attributes: [
        'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
        'node_type', 'hierarchy_level', 'display_order', 'created_at', 'updated_at'
      ]
    });

    // Add metadata for each category
    const categoriesWithMeta = await Promise.all(
      rootCategories.map(async (category) => {
        const subcategories_count = await Category.count({
          where: { 
            parent_category_id: category.id, 
            is_active: true 
          }
        });

        const questions_count = await Question.count({
          where: { 
            category_id: category.id,
            is_active: true 
          }
        });

        // Count total questions recursively (including subcategories)
        const totalQuestions = await sequelize.query(`
          WITH RECURSIVE category_tree AS (
            SELECT id, parent_category_id FROM categories WHERE id = ?
            UNION ALL
            SELECT c.id, c.parent_category_id 
            FROM categories c
            INNER JOIN category_tree ct ON c.parent_category_id = ct.id
          )
          SELECT COUNT(q.id) as total
          FROM questions q
          INNER JOIN category_tree ct ON q.category_id = ct.id
          WHERE q.is_active = true
        `, {
          replacements: [category.id],
          type: Sequelize.QueryTypes.SELECT
        });

        return {
          ...category.toJSON(),
          subcategories_count,
          questions_count,
          total_questions_count: totalQuestions[0]?.total || 0,
          has_subcategories: subcategories_count > 0,
          has_questions: questions_count > 0,
        };
      })
    );

    // Check subscription if user is authenticated
    let is_subscribed = false;
    if (req.user) {
      const subscription = await Subscription.findOne({
        where: {
          user_id: req.user.uuid,
          test_series_id: series.id,
          status: 'completed',
          [Sequelize.Op.or]: [
            { expiry_date: null },
            { expiry_date: { [Sequelize.Op.gt]: new Date() } }
          ]
        }
      });
      is_subscribed = !!subscription;
    }

    res.json({
      success: true,
      data: {
        ...series.toJSON(),
        categories: categoriesWithMeta,
        is_subscribed,
        title: series.name, // Backwards compatibility
        content_type: 'categories'
      }
    });

  } catch (error) {
    console.error('Error fetching test series details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test series details'
    });
  }
});

// Get category details with subcategories or questions
router.get('/dynamic/categories/:uuid', optionalAuth, async (req, res) => {
  try {
    const { uuid } = req.params;

    const category = await Category.findOne({
      where: { uuid, is_active: true },
      include: [{
        model: TestSeries,
        as: 'testSeries',
        attributes: ['id', 'uuid', 'name', 'pricing_type', 'is_active']
      }],
      attributes: [
        'id', 'uuid', 'test_series_id', 'parent_category_id', 'name', 'description', 
        'name_gujarati', 'description_gujarati', 'node_type', 'hierarchy_level', 
        'display_order', 'created_at', 'updated_at'
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Build breadcrumb trail
    const breadcrumb = [];
    let currentCategory = category;
    
    while (currentCategory) {
      breadcrumb.unshift({
        id: currentCategory.id,
        uuid: currentCategory.uuid,
        name: currentCategory.name,
        hierarchy_level: currentCategory.hierarchy_level
      });

      if (currentCategory.parent_category_id) {
        currentCategory = await Category.findOne({
          where: { id: currentCategory.parent_category_id },
          attributes: ['id', 'uuid', 'name', 'parent_category_id', 'hierarchy_level']
        });
      } else {
        currentCategory = null;
      }
    }

    // Determine content type and fetch appropriate data
    let content = [];
    let content_type = 'empty';

    // Check if category has subcategories
    const subcategories = await Category.findAll({
      where: {
        parent_category_id: category.id,
        is_active: true
      },
      order: [['display_order', 'ASC'], ['name', 'ASC']],
      attributes: [
        'id', 'uuid', 'name', 'description', 'name_gujarati', 'description_gujarati',
        'node_type', 'hierarchy_level', 'display_order', 'created_at', 'updated_at'
      ]
    });

    if (subcategories.length > 0) {
      content_type = 'categories';
      content = await Promise.all(
        subcategories.map(async (subcat) => {
          const subcategories_count = await Category.count({
            where: { parent_category_id: subcat.id, is_active: true }
          });
          const questions_count = await Question.count({
            where: { category_id: subcat.id, is_active: true }
          });

          // Count total questions recursively (including all descendant categories)
          const totalQuestionsRecursive = await sequelize.query(`
            WITH RECURSIVE category_tree AS (
              SELECT id, parent_category_id FROM categories WHERE id = ?
              UNION ALL
              SELECT c.id, c.parent_category_id 
              FROM categories c
              INNER JOIN category_tree ct ON c.parent_category_id = ct.id
              WHERE c.is_active = true
            )
            SELECT COUNT(q.id) as total
            FROM questions q
            INNER JOIN category_tree ct ON q.category_id = ct.id
            WHERE q.is_active = true
          `, {
            replacements: [subcat.id],
            type: Sequelize.QueryTypes.SELECT
          });

          const total_questions_recursive = totalQuestionsRecursive[0]?.total || 0;

          return {
            ...subcat.toJSON(),
            subcategories_count,
            questions_count,
            total_questions_recursive: parseInt(total_questions_recursive),
            has_subcategories: subcategories_count > 0,
            has_questions: questions_count > 0,
            has_questions_recursive: total_questions_recursive > 0,
          };
        })
      );
    } else {
      // Check if category has questions
      const questions = await Question.findAll({
        where: {
          category_id: category.id,
          is_active: true
        },
        order: [['display_order', 'ASC'], ['id', 'ASC']],
        attributes: [
          'id', 'uuid', 'question_text', 'question_text_gujarati',
          'option_a', 'option_a_gujarati', 'option_b', 'option_b_gujarati',
          'option_c', 'option_c_gujarati', 'option_d', 'option_d_gujarati',
          'correct_answer', 'explanation', 'explanation_gujarati', 'marks',
          'created_at', 'updated_at'
        ]
      });

      if (questions.length > 0) {
        content_type = 'questions';
        content = questions.map(q => q.toJSON());
      }
    }

    // Calculate total questions in this category recursively
    const totalQuestionsInCategory = await sequelize.query(`
      WITH RECURSIVE category_tree AS (
        SELECT id, parent_category_id FROM categories WHERE id = ?
        UNION ALL
        SELECT c.id, c.parent_category_id 
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_category_id = ct.id
        WHERE c.is_active = true
      )
      SELECT COUNT(q.id) as total
      FROM questions q
      INNER JOIN category_tree ct ON q.category_id = ct.id
      WHERE q.is_active = true
    `, {
      replacements: [category.id],
      type: Sequelize.QueryTypes.SELECT
    });

    const total_questions_recursive = parseInt(totalQuestionsInCategory[0]?.total || 0);

    // Check subscription
    let is_subscribed = false;
    if (req.user && category.testSeries) {
      const subscription = await Subscription.findOne({
        where: {
          user_id: req.user.uuid,
          test_series_id: category.test_series_id,
          status: 'completed',
          [Sequelize.Op.or]: [
            { expiry_date: null },
            { expiry_date: { [Sequelize.Op.gt]: new Date() } }
          ]
        }
      });
      is_subscribed = !!subscription;
    }

    res.json({
      success: true,
      data: {
        category: {
          ...category.toJSON(),
          is_subscribed
        },
        content_type,
        content,
        breadcrumb,
        // Statistics
        statistics: {
          subcategories_count: subcategories.length,
          questions_count: content_type === 'questions' ? content.length : 0,
          total_questions_recursive: total_questions_recursive,
          hierarchy_level: category.hierarchy_level,
          is_leaf_category: content_type === 'questions',
          has_questions_somewhere: total_questions_recursive > 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching category details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category details'
    });
  }
});

// Get all questions recursively from a category and its subcategories (for quiz/test functionality)
router.get('/dynamic/categories/:uuid/questions', optionalAuth, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { language = 'english', shuffle = false } = req.query;

    const category = await Category.findOne({
      where: { uuid, is_active: true },
      include: [{
        model: TestSeries,
        as: 'testSeries',
        attributes: ['id', 'pricing_type']
      }]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check subscription for paid content
    if (category.testSeries.pricing_type === 'paid') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to access paid content',
          requiresAuth: true
        });
      }

      // Use our new subscription access check logic
      const accessCheck = await checkUserTestSeriesAccess(req.user.uuid, category.testSeries.id);
      
      if (!accessCheck.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Subscription required to access this content. Please purchase a subscription to continue.',
          errorCode: 'ACCESS_DENIED',
          accessRequired: true,
          testSeriesId: category.testSeries.id,
          reason: accessCheck.reason
        });
      }
    }

    // Get all questions from this category and all its descendant categories recursively
    let questionsQuery = `
      WITH RECURSIVE category_tree AS (
        SELECT id, parent_category_id FROM categories WHERE id = ?
        UNION ALL
        SELECT c.id, c.parent_category_id 
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_category_id = ct.id
        WHERE c.is_active = true
      )
      SELECT q.id, q.uuid, q.question_text, q.question_text_gujarati,
             q.option_a, q.option_a_gujarati, q.option_b, q.option_b_gujarati,
             q.option_c, q.option_c_gujarati, q.option_d, q.option_d_gujarati,
             q.correct_answer, q.explanation, q.explanation_gujarati, q.marks,
             q.display_order, q.category_id
      FROM questions q
      INNER JOIN category_tree ct ON q.category_id = ct.id
      WHERE q.is_active = true
    `;

    if (shuffle === 'true') {
      questionsQuery += ' ORDER BY RAND()';
    } else {
      questionsQuery += ' ORDER BY q.display_order ASC, q.id ASC';
    }

    const questions = await sequelize.query(questionsQuery, {
      replacements: [category.id],
      type: Sequelize.QueryTypes.SELECT
    });

    // Format questions based on language preference
    const formattedQuestions = questions.map(question => {
      const formatted = {
        id: question.id,
        uuid: question.uuid,
        question_text: language === 'gujarati' && question.question_text_gujarati 
          ? question.question_text_gujarati 
          : question.question_text,
        correct_answer: question.correct_answer,
        explanation: language === 'gujarati' && question.explanation_gujarati 
          ? question.explanation_gujarati 
          : question.explanation,
        marks: question.marks,
        options: {}
      };

      // Format options based on language
      ['A', 'B', 'C', 'D'].forEach(option => {
        const optionKey = `option_${option.toLowerCase()}`;
        const gujaratiKey = `${optionKey}_gujarati`;
        formatted.options[option] = language === 'gujarati' && question[gujaratiKey]
          ? question[gujaratiKey]
          : question[optionKey];
      });

      return formatted;
    });

    res.json({
      success: true,
      data: {
        category: {
          id: category.id,
          uuid: category.uuid,
          name: category.name,
          name_gujarati: category.name_gujarati,
          description: category.description,
          description_gujarati: category.description_gujarati,
        },
        questions: formattedQuestions,
        metadata: {
          total_questions: formattedQuestions.length,
          language: language,
          shuffled: shuffle === 'true'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
    });
  }
});

// Get solutions for category quiz (for category-based quizzes without session)
router.get('/dynamic/categories/:uuid/solutions', optionalAuth, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { language = 'english' } = req.query;

    const category = await Category.findOne({
      where: { uuid, is_active: true },
      include: [{
        model: TestSeries,
        as: 'testSeries',
        attributes: ['id', 'pricing_type']
      }]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check subscription for paid content
    if (category.testSeries.pricing_type === 'paid') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to access paid content',
          requiresAuth: true
        });
      }

      // Use our new subscription access check logic
      const accessCheck = await checkUserTestSeriesAccess(req.user.uuid, category.testSeries.id);
      
      if (!accessCheck.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Subscription required to access this content. Please purchase a subscription to continue.',
          errorCode: 'ACCESS_DENIED',
          accessRequired: true,
          testSeriesId: category.testSeries.id,
          reason: accessCheck.reason
        });
      }
    }

    // Get all questions from this category and all its descendant categories recursively
    const questionsQuery = `
      WITH RECURSIVE category_tree AS (
        SELECT id, parent_category_id FROM categories WHERE id = ?
        UNION ALL
        SELECT c.id, c.parent_category_id 
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_category_id = ct.id
        WHERE c.is_active = true
      )
      SELECT q.id, q.uuid, q.question_text, q.question_text_gujarati,
             q.option_a, q.option_a_gujarati, q.option_b, q.option_b_gujarati,
             q.option_c, q.option_c_gujarati, q.option_d, q.option_d_gujarati,
             q.correct_answer, q.explanation, q.explanation_gujarati, q.marks,
             q.display_order
      FROM questions q
      INNER JOIN category_tree ct ON q.category_id = ct.id
      WHERE q.is_active = true
      ORDER BY q.display_order ASC, q.id ASC
    `;

    const questions = await sequelize.query(questionsQuery, {
      replacements: [category.id],
      type: Sequelize.QueryTypes.SELECT
    });

    // Format solutions based on language preference
    const solutions = questions.map(question => {
      const formatted = {
        id: question.id,
        uuid: question.uuid,
        question_text: language === 'gujarati' && question.question_text_gujarati 
          ? question.question_text_gujarati 
          : question.question_text,
        correct_answer: question.correct_answer,
        explanation: language === 'gujarati' && question.explanation_gujarati 
          ? question.explanation_gujarati 
          : question.explanation,
        marks: question.marks,
        options: {}
      };

      // Format options based on language
      ['A', 'B', 'C', 'D'].forEach(option => {
        const optionKey = `option_${option.toLowerCase()}`;
        const gujaratiKey = `${optionKey}_gujarati`;
        formatted.options[option] = language === 'gujarati' && question[gujaratiKey]
          ? question[gujaratiKey]
          : question[optionKey];
      });

      return formatted;
    });

    res.json({
      success: true,
      data: {
        category: {
          id: category.id,
          uuid: category.uuid,
          name: category.name,
          name_gujarati: category.name_gujarati,
          description: category.description,
          description_gujarati: category.description_gujarati,
        },
        solutions: solutions,
        metadata: {
          total_questions: solutions.length,
          language: language
        }
      }
    });

  } catch (error) {
    console.error('Error fetching solutions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch solutions'
    });
  }
});

module.exports = router;