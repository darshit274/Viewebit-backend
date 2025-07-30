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
        attributes: ['id', 'uuid', 'name', 'description', 'is_active', 'created_at', 'updated_at'],
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
        description: series.description,
        is_active: series.is_active,
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
      const { title, description } = req.body;

      const testSeries = await TestSeries.create({
        name: title,
        description
      });

      // Transform response to match frontend expectations
      res.status(201).json({
        success: true,
        data: {
          id: testSeries.id,
          uuid: testSeries.uuid,
          title: testSeries.name,
          description: testSeries.description,
          is_active: testSeries.is_active,
          created_at: testSeries.created_at,
          updated_at: testSeries.updated_at
        },
        message: 'Test series created successfully'
      });
    } catch (error) {
      console.error('Error creating test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test series'
      });
    }
  }

  // Update test series
  async updateTestSeries(req, res) {
    try {
      const { uuid } = req.params;
      const { title, description } = req.body;

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

      await testSeries.update({ name: title, description });

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
      const { name, description } = req.body;

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
        description
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

  // Update category
  async updateCategory(req, res) {
    try {
      const { uuid } = req.params;
      const { name, description } = req.body;

      const category = await Category.findOne({ where: { uuid } });
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      await category.update({ name, description });

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
      const { name, description } = req.body;

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
        description
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

  // Update sub-category
  async updateSubCategory(req, res) {
    try {
      const { uuid } = req.params;
      const { name, description } = req.body;

      const subCategory = await SubCategory.findOne({ where: { uuid } });
      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: 'Sub-category not found'
        });
      }

      await subCategory.update({ name, description });

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
      const { title, description, duration_minutes, total_marks } = req.body;

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
        total_marks: total_marks || 0
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

  // Update test
  async updateTest(req, res) {
    try {
      const { uuid } = req.params;
      const { title, description, duration_minutes, total_marks } = req.body;

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
        total_marks 
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
        marks 
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
        marks: marks || 1
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
        marks 
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
        marks
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
}

module.exports = new TestManagementController();