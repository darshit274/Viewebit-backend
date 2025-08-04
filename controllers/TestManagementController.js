const { TestSeries, Category, SubCategory, Test, Question } = require('../models');
const { Op } = require('sequelize');

class TestManagementController {
  // =====================
  // TEST SERIES MANAGEMENT
  // =====================
  
  // Get all test series with pagination, filtering, and statistics
  async getTestSeries(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = 'all',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build where clause
      let where = {};
      if (status === 'active') {
        where.is_active = true;
      } else if (status === 'inactive') {
        where.is_active = false;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Get paginated data
      const { count, rows: testSeries } = await TestSeries.findAndCountAll({
        attributes: [
          'id', 'uuid', 'name', 'name_gujarati', 'description', 'description_gujarati', 'is_active', 'created_at', 'updated_at',
          'pricing_type', 'price', 'currency', 'demo_tests_count', 'subscription_duration_days',
          'features', 'discount_percentage', 'is_featured'
        ],
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset,
        include: [{
          model: Category,
          as: 'categories',
          attributes: ['id'],
          required: false
        }]
      });

      // Get statistics
      const stats = {
        total: await TestSeries.count(),
        active: await TestSeries.count({ where: { is_active: true } }),
        inactive: await TestSeries.count({ where: { is_active: false } }),
        withCategories: await TestSeries.count({
          include: [{
            model: Category,
            as: 'categories',
            required: true
          }]
        })
      };

      // Transform data to match frontend expectations
      const transformedSeries = testSeries.map(series => ({
        id: series.id,
        uuid: series.uuid,
        title: series.name, // Map name to title for frontend
        title_gujarati: series.name_gujarati,
        description: series.description,
        description_gujarati: series.description_gujarati,
        is_active: series.is_active,
        pricing_type: series.pricing_type,
        price: series.price,
        currency: series.currency,
        demo_tests_count: series.demo_tests_count,
        subscription_duration_days: series.subscription_duration_days,
        features: series.features,
        discount_percentage: series.discount_percentage,
        is_featured: series.is_featured,
        created_at: series.created_at,
        updated_at: series.updated_at,
        categories_count: series.categories ? series.categories.length : 0
      }));

      res.json({
        success: true,
        data: transformedSeries,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        },
        stats
      });
    } catch (error) {
      console.error('Error fetching test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test series'
      });
    }
  }

  // Create new test series
  async createTestSeries(req, res) {
    try {
      const { 
        title, 
        description, 
        title_gujarati, 
        description_gujarati, 
        is_active,
        pricing_type,
        price,
        currency,
        demo_tests_count,
        subscription_duration_days,
        features,
        discount_percentage,
        is_featured,
        is_free,
        free_tests_count,
        requires_subscription,
        negative_marking_enabled,
        negative_marking_value,
        one_time_completion,
        max_attempts,
        auto_submit_on_expire
      } = req.body;

      const testSeries = await TestSeries.create({
        name: title,
        description,
        name_gujarati: title_gujarati,
        description_gujarati,
        is_active: is_active !== undefined ? is_active : true,
        pricing_type: pricing_type || 'free',
        price: price || 0.00,
        currency: currency || 'INR',
        demo_tests_count: demo_tests_count || 0,
        subscription_duration_days: subscription_duration_days || 365,
        features: features || [],
        discount_percentage: discount_percentage || 0.00,
        is_featured: is_featured || false,
        // Additional fields that match the existing table structure
        difficulty_level: 'beginner', // Required field
        free_test_count: free_tests_count || 0, // Use existing field name
        max_attempts_per_test: max_attempts || 1, // Use existing field name
        has_negative_marking: negative_marking_enabled || false, // Use existing field name
        negative_marks: negative_marking_value || 0.25, // Use existing field name
        supports_pause_resume: true,
        supports_multilanguage: true
      });

      // Transform response to match frontend expectations
      res.status(201).json({
        success: true,
        data: {
          id: testSeries.id,
          uuid: testSeries.uuid,
          title: testSeries.name,
          title_gujarati: testSeries.name_gujarati,
          description: testSeries.description,
          description_gujarati: testSeries.description_gujarati,
          is_active: testSeries.is_active,
          pricing_type: testSeries.pricing_type,
          price: testSeries.price,
          currency: testSeries.currency,
          demo_tests_count: testSeries.demo_tests_count,
          subscription_duration_days: testSeries.subscription_duration_days,
          features: testSeries.features,
          discount_percentage: testSeries.discount_percentage,
          is_featured: testSeries.is_featured,
          is_free: testSeries.is_free,
          free_tests_count: testSeries.free_tests_count,
          requires_subscription: testSeries.requires_subscription,
          negative_marking_enabled: testSeries.negative_marking_enabled,
          negative_marking_value: testSeries.negative_marking_value,
          one_time_completion: testSeries.one_time_completion,
          max_attempts: testSeries.max_attempts,
          auto_submit_on_expire: testSeries.auto_submit_on_expire,
          created_at: testSeries.created_at,
          updated_at: testSeries.updated_at
        },
        message: 'Test series created successfully'
      });
    } catch (error) {
      console.error('Error creating test series:', error);
      console.error('Error stack:', error.stack);
      console.error('Request body:', req.body);
      
      // More detailed error response
      const errorResponse = {
        success: false,
        message: 'Failed to create test series'
      };
      
      if (process.env.NODE_ENV === 'development' || true) { // Always show error in dev
        errorResponse.error = error.message;
        errorResponse.details = error.errors ? error.errors.map(e => ({
          field: e.path,
          message: e.message,
          type: e.type
        })) : undefined;
      }
      
      res.status(500).json(errorResponse);
    }
  }

  // Bulk operations for test series
  async bulkOperationsTestSeries(req, res) {
    try {
      const { action, testSeriesIds } = req.body;
      
      if (!action || !testSeriesIds || !Array.isArray(testSeriesIds)) {
        return res.status(400).json({
          success: false,
          message: 'Action and testSeriesIds array are required'
        });
      }

      let message = '';
      let updateData = {};

      switch (action) {
        case 'delete':
          await TestSeries.destroy({
            where: { uuid: { [Op.in]: testSeriesIds } }
          });
          message = `${testSeriesIds.length} test series deleted successfully`;
          break;
        case 'activate':
          updateData = { is_active: true };
          await TestSeries.update(updateData, {
            where: { uuid: { [Op.in]: testSeriesIds } }
          });
          message = `${testSeriesIds.length} test series activated successfully`;
          break;
        case 'deactivate':
          updateData = { is_active: false };
          await TestSeries.update(updateData, {
            where: { uuid: { [Op.in]: testSeriesIds } }
          });
          message = `${testSeriesIds.length} test series deactivated successfully`;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action. Supported actions: delete, activate, deactivate'
          });
      }

      res.json({
        success: true,
        message,
        data: { action, count: testSeriesIds.length }
      });
    } catch (error) {
      console.error('Error in bulk operations for test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operations'
      });
    }
  }

  // Update test series
  async updateTestSeries(req, res) {
    try {
      const { uuid } = req.params;
      const { 
        title, 
        description, 
        title_gujarati, 
        description_gujarati, 
        is_active,
        pricing_type,
        price,
        currency,
        demo_tests_count,
        subscription_duration_days,
        features,
        discount_percentage,
        is_featured
      } = req.body;

      const testSeries = await TestSeries.findOne({ 
        attributes: ['id', 'uuid', 'name', 'description', 'is_active'],
        where: { uuid } 
      });
      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      const updateData = { 
        name: title, 
        description, 
        name_gujarati: title_gujarati, 
        description_gujarati, 
        is_active 
      };

      // Add pricing fields if provided
      if (pricing_type !== undefined) updateData.pricing_type = pricing_type;
      if (price !== undefined) updateData.price = price;
      if (currency !== undefined) updateData.currency = currency;
      if (demo_tests_count !== undefined) updateData.demo_tests_count = demo_tests_count;
      if (subscription_duration_days !== undefined) updateData.subscription_duration_days = subscription_duration_days;
      if (features !== undefined) updateData.features = features;
      if (discount_percentage !== undefined) updateData.discount_percentage = discount_percentage;
      if (is_featured !== undefined) updateData.is_featured = is_featured;

      await testSeries.update(updateData);

      res.json({
        success: true,
        data: testSeries,
        message: 'Test series updated successfully'
      });
    } catch (error) {
      console.error('Error updating test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update test series'
      });
    }
  }

  // Delete test series
  async deleteTestSeries(req, res) {
    try {
      const { uuid } = req.params;

      const testSeries = await TestSeries.findOne({ 
        attributes: ['id', 'uuid', 'name', 'description', 'is_active'],
        where: { uuid } 
      });
      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      await testSeries.update({ is_active: false });

      res.json({
        success: true,
        message: 'Test series deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete test series'
      });
    }
  }

  // =====================
  // CATEGORIES MANAGEMENT
  // =====================

  // Get categories for a test series with pagination, filtering, and statistics
  async getTestSeriesCategories(req, res) {
    try {
      const { testSeriesUuid } = req.params;
      const {
        page = 1,
        limit = 10,
        search = '',
        status = 'all',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // First find the test series
      const testSeries = await TestSeries.findOne({
        attributes: ['id', 'uuid', 'name', 'description', 'is_active', 'created_at', 'updated_at'],
        where: { uuid: testSeriesUuid, is_active: true }
      });

      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      // Build where clause
      let where = { test_series_id: testSeries.id };
      if (status === 'active') {
        where.is_active = true;
      } else if (status === 'inactive') {
        where.is_active = false;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Get paginated categories
      const { count, rows: categories } = await Category.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset,
        include: [{
          model: SubCategory,
          as: 'subCategories',
          attributes: ['id'],
          required: false
        }]
      });

      // Get statistics
      const stats = {
        total: await Category.count({ where: { test_series_id: testSeries.id } }),
        active: await Category.count({ where: { test_series_id: testSeries.id, is_active: true } }),
        inactive: await Category.count({ where: { test_series_id: testSeries.id, is_active: false } }),
        withSubCategories: await Category.count({
          where: { test_series_id: testSeries.id },
          include: [{
            model: SubCategory,
            as: 'subCategories',
            required: true
          }]
        })
      };

      // Transform data to match frontend expectations
      const transformedTestSeries = {
        id: testSeries.id,
        uuid: testSeries.uuid,
        title: testSeries.name,
        description: testSeries.description,
        is_active: testSeries.is_active,
        created_at: testSeries.created_at,
        updated_at: testSeries.updated_at
      };

      const transformedCategories = categories.map(category => ({
        ...category.toJSON(),
        subCategories_count: category.subCategories ? category.subCategories.length : 0
      }));

      res.json({
        success: true,
        data: {
          testSeries: transformedTestSeries,
          categories: transformedCategories
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        },
        stats
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }
  }

  // Create new category
  async createCategory(req, res) {
    try {
      const { testSeriesUuid } = req.params;
      const { name, description, name_gujarati, description_gujarati, is_active } = req.body;

      const testSeries = await TestSeries.findOne({ 
        attributes: ['id', 'uuid', 'name', 'description', 'is_active'],
        where: { uuid: testSeriesUuid, is_active: true } 
      });
      
      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      const category = await Category.create({
        test_series_id: testSeries.id,
        name,
        description,
        name_gujarati,
        description_gujarati,
        is_active: is_active !== undefined ? is_active : true
      });

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create category'
      });
    }
  }

  // Bulk operations for categories
  async bulkOperationsCategories(req, res) {
    try {
      const { action, categoryIds } = req.body;
      
      if (!action || !categoryIds || !Array.isArray(categoryIds)) {
        return res.status(400).json({
          success: false,
          message: 'Action and categoryIds array are required'
        });
      }

      let message = '';
      let updateData = {};

      switch (action) {
        case 'delete':
          await Category.destroy({
            where: { uuid: { [Op.in]: categoryIds } }
          });
          message = `${categoryIds.length} categories deleted successfully`;
          break;
        case 'activate':
          updateData = { is_active: true };
          await Category.update(updateData, {
            where: { uuid: { [Op.in]: categoryIds } }
          });
          message = `${categoryIds.length} categories activated successfully`;
          break;
        case 'deactivate':
          updateData = { is_active: false };
          await Category.update(updateData, {
            where: { uuid: { [Op.in]: categoryIds } }
          });
          message = `${categoryIds.length} categories deactivated successfully`;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action. Supported actions: delete, activate, deactivate'
          });
      }

      res.json({
        success: true,
        message,
        data: { action, count: categoryIds.length }
      });
    } catch (error) {
      console.error('Error in bulk operations for categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operations'
      });
    }
  }

  // Update category
  async updateCategory(req, res) {
    try {
      const { uuid } = req.params;
      const { name, description, name_gujarati, description_gujarati, is_active } = req.body;

      const category = await Category.findOne({ where: { uuid } });
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      await category.update({ name, description, name_gujarati, description_gujarati, is_active });

      res.json({
        success: true,
        data: category,
        message: 'Category updated successfully'
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category'
      });
    }
  }

  // Delete category
  async deleteCategory(req, res) {
    try {
      const { uuid } = req.params;

      const category = await Category.findOne({ where: { uuid } });
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      await category.update({ is_active: false });

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category'
      });
    }
  }

  // =====================
  // SUB-CATEGORIES MANAGEMENT
  // =====================

  // Get sub-categories for a category with pagination, filtering, and statistics
  async getCategorySubCategories(req, res) {
    try {
      const { categoryUuid } = req.params;
      const {
        page = 1,
        limit = 10,
        search = '',
        status = 'all',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // First find the category
      const category = await Category.findOne({
        where: { uuid: categoryUuid, is_active: true }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Build where clause
      let where = { category_id: category.id };
      if (status === 'active') {
        where.is_active = true;
      } else if (status === 'inactive') {
        where.is_active = false;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Get paginated sub-categories
      const { count, rows: subCategories } = await SubCategory.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset,
        include: [{
          model: Test,
          as: 'tests',
          attributes: ['id'],
          required: false
        }]
      });

      // Get statistics
      const stats = {
        total: await SubCategory.count({ where: { category_id: category.id } }),
        active: await SubCategory.count({ where: { category_id: category.id, is_active: true } }),
        inactive: await SubCategory.count({ where: { category_id: category.id, is_active: false } }),
        withTests: await SubCategory.count({
          where: { category_id: category.id },
          include: [{
            model: Test,
            as: 'tests',
            required: true
          }]
        })
      };

      // Transform data
      const transformedSubCategories = subCategories.map(subCategory => ({
        ...subCategory.toJSON(),
        tests_count: subCategory.tests ? subCategory.tests.length : 0
      }));

      res.json({
        success: true,
        data: {
          category,
          subCategories: transformedSubCategories
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        },
        stats
      });
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sub-categories'
      });
    }
  }

  // Create new sub-category
  async createSubCategory(req, res) {
    try {
      const { categoryUuid } = req.params;
      const { name, description, name_gujarati, description_gujarati, is_active } = req.body;

      const category = await Category.findOne({ 
        where: { uuid: categoryUuid, is_active: true } 
      });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      const subCategory = await SubCategory.create({
        category_id: category.id,
        name,
        description,
        name_gujarati,
        description_gujarati,
        is_active: is_active !== undefined ? is_active : true
      });

      res.status(201).json({
        success: true,
        data: subCategory,
        message: 'Sub-category created successfully'
      });
    } catch (error) {
      console.error('Error creating sub-category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create sub-category'
      });
    }
  }

  // Bulk operations for sub-categories
  async bulkOperationsSubCategories(req, res) {
    try {
      const { action, subCategoryIds } = req.body;
      
      if (!action || !subCategoryIds || !Array.isArray(subCategoryIds)) {
        return res.status(400).json({
          success: false,
          message: 'Action and subCategoryIds array are required'
        });
      }

      let message = '';
      let updateData = {};

      switch (action) {
        case 'delete':
          await SubCategory.destroy({
            where: { uuid: { [Op.in]: subCategoryIds } }
          });
          message = `${subCategoryIds.length} sub-categories deleted successfully`;
          break;
        case 'activate':
          updateData = { is_active: true };
          await SubCategory.update(updateData, {
            where: { uuid: { [Op.in]: subCategoryIds } }
          });
          message = `${subCategoryIds.length} sub-categories activated successfully`;
          break;
        case 'deactivate':
          updateData = { is_active: false };
          await SubCategory.update(updateData, {
            where: { uuid: { [Op.in]: subCategoryIds } }
          });
          message = `${subCategoryIds.length} sub-categories deactivated successfully`;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action. Supported actions: delete, activate, deactivate'
          });
      }

      res.json({
        success: true,
        message,
        data: { action, count: subCategoryIds.length }
      });
    } catch (error) {
      console.error('Error in bulk operations for sub-categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operations'
      });
    }
  }

  // Update sub-category
  async updateSubCategory(req, res) {
    try {
      const { uuid } = req.params;
      const { name, description, name_gujarati, description_gujarati, is_active } = req.body;

      const subCategory = await SubCategory.findOne({ where: { uuid } });
      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: 'Sub-category not found'
        });
      }

      await subCategory.update({ name, description, name_gujarati, description_gujarati, is_active });

      res.json({
        success: true,
        data: subCategory,
        message: 'Sub-category updated successfully'
      });
    } catch (error) {
      console.error('Error updating sub-category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update sub-category'
      });
    }
  }

  // Delete sub-category
  async deleteSubCategory(req, res) {
    try {
      const { uuid } = req.params;

      const subCategory = await SubCategory.findOne({ where: { uuid } });
      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: 'Sub-category not found'
        });
      }

      await subCategory.update({ is_active: false });

      res.json({
        success: true,
        message: 'Sub-category deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting sub-category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete sub-category'
      });
    }
  }

  // =====================
  // TESTS MANAGEMENT
  // =====================

  // Get tests for a sub-category with pagination, filtering, and statistics
  async getSubCategoryTests(req, res) {
    try {
      const { subCategoryUuid } = req.params;
      const {
        page = 1,
        limit = 10,
        search = '',
        status = 'all',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // First find the sub-category
      const subCategory = await SubCategory.findOne({
        where: { uuid: subCategoryUuid, is_active: true }
      });

      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: 'Sub-category not found'
        });
      }

      // Build where clause
      let where = { sub_category_id: subCategory.id };
      if (status === 'active') {
        where.is_active = true;
      } else if (status === 'inactive') {
        where.is_active = false;
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Get paginated tests
      const { count, rows: tests } = await Test.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset,
        include: [{
          model: Question,
          as: 'questions',
          attributes: ['id'],
          required: false
        }]
      });

      // Get statistics
      const stats = {
        total: await Test.count({ where: { sub_category_id: subCategory.id } }),
        active: await Test.count({ where: { sub_category_id: subCategory.id, is_active: true } }),
        inactive: await Test.count({ where: { sub_category_id: subCategory.id, is_active: false } }),
        withQuestions: await Test.count({
          where: { sub_category_id: subCategory.id },
          include: [{
            model: Question,
            as: 'questions',
            required: true
          }]
        })
      };

      // Transform data
      const transformedTests = tests.map(test => ({
        ...test.toJSON(),
        questions_count: test.questions ? test.questions.length : 0
      }));

      res.json({
        success: true,
        data: {
          subCategory,
          tests: transformedTests
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        },
        stats
      });
    } catch (error) {
      console.error('Error fetching tests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tests'
      });
    }
  }

  // Create new test
  async createTest(req, res) {
    try {
      const { subCategoryUuid } = req.params;
      const { 
        title, 
        description, 
        duration_minutes, 
        total_marks, 
        title_gujarati, 
        description_gujarati, 
        is_active,
        is_demo,
        is_free_in_paid_series,
        negative_marking_enabled,
        negative_marks_per_wrong,
        is_one_time_only,
        max_duration_minutes,
        attempt_restrictions,
        passing_marks,
        instructions,
        instructions_gujarati
      } = req.body;

      const subCategory = await SubCategory.findOne({ 
        where: { uuid: subCategoryUuid, is_active: true } 
      });
      
      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: 'Sub-category not found'
        });
      }

      const test = await Test.create({
        sub_category_id: subCategory.id,
        title,
        description,
        duration_minutes: duration_minutes || 60,
        total_marks: total_marks || 0,
        title_gujarati,
        description_gujarati,
        is_active: is_active !== undefined ? is_active : true,
        is_demo: is_demo || false,
        is_free_in_paid_series: is_free_in_paid_series || false,
        negative_marking_enabled: negative_marking_enabled || false,
        negative_marks_per_wrong: negative_marks_per_wrong || 0.25,
        is_one_time_only: is_one_time_only || false,
        max_duration_minutes: max_duration_minutes || null,
        attempt_restrictions: attempt_restrictions || null,
        passing_marks: passing_marks || null,
        instructions: instructions || null,
        instructions_gujarati: instructions_gujarati || null
      });

      res.status(201).json({
        success: true,
        data: test,
        message: 'Test created successfully'
      });
    } catch (error) {
      console.error('Error creating test:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test'
      });
    }
  }

  // Bulk operations for tests
  async bulkOperationsTests(req, res) {
    try {
      const { action, testIds } = req.body;
      
      if (!action || !testIds || !Array.isArray(testIds)) {
        return res.status(400).json({
          success: false,
          message: 'Action and testIds array are required'
        });
      }

      let message = '';
      let updateData = {};

      switch (action) {
        case 'delete':
          await Test.destroy({
            where: { uuid: { [Op.in]: testIds } }
          });
          message = `${testIds.length} tests deleted successfully`;
          break;
        case 'activate':
          updateData = { is_active: true };
          await Test.update(updateData, {
            where: { uuid: { [Op.in]: testIds } }
          });
          message = `${testIds.length} tests activated successfully`;
          break;
        case 'deactivate':
          updateData = { is_active: false };
          await Test.update(updateData, {
            where: { uuid: { [Op.in]: testIds } }
          });
          message = `${testIds.length} tests deactivated successfully`;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action. Supported actions: delete, activate, deactivate'
          });
      }

      res.json({
        success: true,
        message,
        data: { action, count: testIds.length }
      });
    } catch (error) {
      console.error('Error in bulk operations for tests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operations'
      });
    }
  }

  // Update test
  async updateTest(req, res) {
    try {
      const { uuid } = req.params;
      const { title, description, duration_minutes, total_marks, title_gujarati, description_gujarati, is_active } = req.body;

      const test = await Test.findOne({ where: { uuid } });
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      await test.update({ 
        title, 
        description, 
        duration_minutes, 
        total_marks,
        title_gujarati,
        description_gujarati,
        is_active
      });

      res.json({
        success: true,
        data: test,
        message: 'Test updated successfully'
      });
    } catch (error) {
      console.error('Error updating test:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update test'
      });
    }
  }

  // Delete test
  async deleteTest(req, res) {
    try {
      const { uuid } = req.params;

      const test = await Test.findOne({ where: { uuid } });
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      await test.update({ is_active: false });

      res.json({
        success: true,
        message: 'Test deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting test:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete test'
      });
    }
  }

  // =====================
  // QUESTIONS MANAGEMENT
  // =====================

  // Get questions for a test with pagination, filtering, and statistics
  async getTestQuestions(req, res) {
    try {
      const { testUuid } = req.params;
      const {
        page = 1,
        limit = 10,
        search = '',
        status = 'all',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // First find the test
      const test = await Test.findOne({
        where: { uuid: testUuid, is_active: true }
      });

      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      // Build where clause
      let where = { test_id: test.id };
      if (status === 'active') {
        where.is_active = true;
      } else if (status === 'inactive') {
        where.is_active = false;
      }

      if (search) {
        where[Op.or] = [
          { question_text: { [Op.like]: `%${search}%` } },
          { explanation: { [Op.like]: `%${search}%` } }
        ];
      }

      // Get paginated questions
      const { count, rows: questions } = await Question.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset
      });

      // Get statistics
      const stats = {
        total: await Question.count({ where: { test_id: test.id } }),
        active: await Question.count({ where: { test_id: test.id, is_active: true } }),
        inactive: await Question.count({ where: { test_id: test.id, is_active: false } }),
        totalMarks: await Question.sum('marks', { where: { test_id: test.id, is_active: true } }) || 0
      };

      // Calculate average marks per question
      stats.averageMarks = stats.total > 0 ? (stats.totalMarks / stats.total).toFixed(1) : 0;

      res.json({
        success: true,
        data: {
          test,
          questions
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        },
        stats
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch questions'
      });
    }
  }

  // Create new question
  async createQuestion(req, res) {
    try {
      const { testUuid } = req.params;
      const { 
        question_text, 
        option_a, 
        option_b, 
        option_c, 
        option_d, 
        correct_answer, 
        explanation, 
        marks,
        question_text_gujarati,
        option_a_gujarati,
        option_b_gujarati,
        option_c_gujarati,
        option_d_gujarati,
        explanation_gujarati,
        is_active
      } = req.body;

      const test = await Test.findOne({ 
        where: { uuid: testUuid, is_active: true } 
      });
      
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      const question = await Question.create({
        test_id: test.id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        explanation,
        marks: marks || 1,
        question_text_gujarati,
        option_a_gujarati,
        option_b_gujarati,
        option_c_gujarati,
        option_d_gujarati,
        explanation_gujarati,
        is_active: is_active !== undefined ? is_active : true
      });

      // Update test total marks
      const totalMarks = await Question.sum('marks', {
        where: { test_id: test.id, is_active: true }
      });
      await test.update({ total_marks: totalMarks });

      res.status(201).json({
        success: true,
        data: question,
        message: 'Question created successfully'
      });
    } catch (error) {
      console.error('Error creating question:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create question'
      });
    }
  }

  // Update question
  async updateQuestion(req, res) {
    try {
      const { uuid } = req.params;
      const { 
        question_text, 
        option_a, 
        option_b, 
        option_c, 
        option_d, 
        correct_answer, 
        explanation, 
        marks,
        question_text_gujarati,
        option_a_gujarati,
        option_b_gujarati,
        option_c_gujarati,
        option_d_gujarati,
        explanation_gujarati,
        is_active
      } = req.body;

      const question = await Question.findOne({ 
        where: { uuid },
        include: [{ model: Test, as: 'test' }]
      });
      
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      await question.update({
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        explanation,
        marks,
        question_text_gujarati,
        option_a_gujarati,
        option_b_gujarati,
        option_c_gujarati,
        option_d_gujarati,
        explanation_gujarati,
        is_active
      });

      // Update test total marks
      const totalMarks = await Question.sum('marks', {
        where: { test_id: question.test_id, is_active: true }
      });
      await question.test.update({ total_marks: totalMarks });

      res.json({
        success: true,
        data: question,
        message: 'Question updated successfully'
      });
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update question'
      });
    }
  }

  // Delete question
  async deleteQuestion(req, res) {
    try {
      const { uuid } = req.params;

      const question = await Question.findOne({ 
        where: { uuid },
        include: [{ model: Test, as: 'test' }]
      });
      
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      await question.update({ is_active: false });

      // Update test total marks
      const totalMarks = await Question.sum('marks', {
        where: { test_id: question.test_id, is_active: true }
      });
      await question.test.update({ total_marks: totalMarks });

      res.json({
        success: true,
        message: 'Question deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete question'
      });
    }
  }

  // Bulk operations for questions
  async bulkOperationsQuestions(req, res) {
    try {
      const { action, questionIds } = req.body;

      if (!action || !questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Action and questionIds array are required'
        });
      }

      let updateData = {};
      let message = '';

      switch (action) {
        case 'delete':
          updateData = { is_active: false };
          message = `${questionIds.length} questions deleted successfully`;
          break;
        case 'activate':
          updateData = { is_active: true };
          message = `${questionIds.length} questions activated successfully`;
          break;
        case 'deactivate':
          updateData = { is_active: false };
          message = `${questionIds.length} questions deactivated successfully`;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action. Use: delete, activate, or deactivate'
          });
      }

      // Update questions
      const [updatedCount] = await Question.update(updateData, {
        where: {
          uuid: {
            [Op.in]: questionIds
          }
        }
      });

      if (updatedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'No questions found to update'
        });
      }

      // Update test total marks for affected tests
      const affectedQuestions = await Question.findAll({
        where: {
          uuid: {
            [Op.in]: questionIds
          }
        },
        include: [{ model: Test, as: 'test' }]
      });

      const testIds = [...new Set(affectedQuestions.map(q => q.test_id))];
      for (const testId of testIds) {
        const totalMarks = await Question.sum('marks', {
          where: { test_id: testId, is_active: true }
        });
        await Test.update({ total_marks: totalMarks || 0 }, { where: { id: testId } });
      }

      res.json({
        success: true,
        message,
        updatedCount
      });
    } catch (error) {
      console.error('Error in bulk operations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operation'
      });
    }
  }
}

module.exports = new TestManagementController();