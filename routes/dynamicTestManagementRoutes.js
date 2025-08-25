const express = require('express');
const router = express.Router();
const dynamicTestController = require('../controllers/DynamicTestManagementController');
const { adminAuth } = require('../utils/AdminAuth');

// Apply admin authentication middleware to all routes
router.use(adminAuth);

// =====================
// HIERARCHY OVERVIEW ROUTES
// =====================

// Get complete hierarchy for a test series
router.get('/series/:testSeriesId/hierarchy', dynamicTestController.getTestSeriesHierarchy);

// =====================
// CATEGORY MANAGEMENT ROUTES
// =====================

// Create a new category (can be root or subcategory)
router.post('/categories', dynamicTestController.createCategory);

// Get category details with children/questions
router.get('/categories/:categoryId', dynamicTestController.getCategoryDetails);

// Update category
router.put('/categories/:categoryId', dynamicTestController.updateCategory);

// Delete category (only if no children/questions)
router.delete('/categories/:categoryId', dynamicTestController.deleteCategory);

// =====================
// QUESTION MANAGEMENT ROUTES  
// =====================

// Add question to a category
router.post('/categories/:categoryId/questions', dynamicTestController.addQuestion);

// Get all questions for a category
router.get('/categories/:categoryId/questions', dynamicTestController.getQuestions);

// Update specific question
router.put('/questions/:questionId', dynamicTestController.updateQuestion);

// Delete specific question
router.delete('/questions/:questionId', dynamicTestController.deleteQuestion);

// =====================
// BULK OPERATIONS (Future Enhancement)
// =====================

// Bulk create questions
router.post('/categories/:categoryId/questions/bulk', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions array is required'
      });
    }

    // Validate category can have questions
    const DynamicQuestion = require('../models').DynamicQuestion;
    await DynamicQuestion.validateCanAddToCategory(categoryId);

    // Create all questions
    const createdQuestions = [];
    for (let questionData of questions) {
      const question = await DynamicQuestion.create({
        category_id: categoryId,
        ...questionData
      });
      createdQuestions.push(question);
    }

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions created successfully`,
      data: createdQuestions
    });

  } catch (error) {
    console.error('Error in bulk question creation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create questions',
      error: error.message
    });
  }
});

// Move category to different parent
router.post('/categories/:categoryId/move', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { newParentId } = req.body;

    const DynamicCategory = require('../models').DynamicCategory;
    
    const category = await DynamicCategory.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Validate new parent can have subcategories (if newParentId is provided)
    if (newParentId) {
      await DynamicCategory.validateHierarchyRule(newParentId, 'add_subcategory');
      
      // Update hierarchy level based on new parent
      const newParent = await DynamicCategory.findByPk(newParentId);
      await category.update({
        parent_category_id: newParentId,
        hierarchy_level: newParent.hierarchy_level + 1
      });
    } else {
      // Moving to root level
      await category.update({
        parent_category_id: null,
        hierarchy_level: 0
      });
    }

    res.json({
      success: true,
      message: 'Category moved successfully',
      data: category
    });

  } catch (error) {
    console.error('Error moving category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move category',
      error: error.message
    });
  }
});

// =====================
// VALIDATION ROUTES
// =====================

// Check what actions are available for a category
router.get('/categories/:categoryId/available-actions', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const DynamicCategory = require('../models').DynamicCategory;
    const category = await DynamicCategory.findByPk(categoryId, {
      include: [
        { model: DynamicCategory, as: 'subcategories' },
        { model: require('../models').DynamicQuestion, as: 'questions' }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const availableActions = dynamicTestController.getAvailableActions(category);

    res.json({
      success: true,
      data: {
        categoryId,
        nodeType: category.node_type,
        availableActions
      }
    });

  } catch (error) {
    console.error('Error checking available actions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check available actions',
      error: error.message
    });
  }
});

module.exports = router;