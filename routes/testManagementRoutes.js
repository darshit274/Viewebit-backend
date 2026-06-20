const express = require('express');
const router = express.Router();
const testManagementController = require('../controllers/TestManagementController');
const { adminAuth } = require('../utils/AdminAuth');

// =====================
// DYNAMIC HIERARCHY ROUTES (NEW)
// =====================

// /api/admin/test-management/hierarchy/:uuid - Get dynamic hierarchy view
router.get('/hierarchy/:uuid', adminAuth, testManagementController.getTestSeriesWithHierarchy);

// /api/admin/test-management/hierarchy/:testSeriesUuid/categories - Create dynamic category
router.post('/hierarchy/:testSeriesUuid/categories', adminAuth, testManagementController.createDynamicCategory);

// /api/admin/test-management/categories/:categoryId/actions - Get available actions
router.get('/categories/:categoryId/actions', adminAuth, testManagementController.getDynamicCategoryActions);

// =====================
// SIMPLIFIED HIERARCHY ROUTES (NEW)
// =====================

// Get test series root categories with button states
router.get('/simple-hierarchy/:testSeriesUuid', adminAuth, testManagementController.getTestSeriesRootCategories);

// Get category content (subcategories OR questions) with button state
router.get('/simple-hierarchy/categories/:categoryUuid', adminAuth, testManagementController.getCategoryContent);

// Create category (root level or subcategory)
router.post('/simple-hierarchy/categories', adminAuth, testManagementController.createSubCategory);
router.post('/simple-hierarchy/categories/:parentUuid/subcategories', adminAuth, testManagementController.createSubCategory);

// Create question in category
router.post('/simple-hierarchy/categories/:categoryUuid/questions', adminAuth, testManagementController.createQuestionInCategory);

// Create question at test series root level
router.post('/simple-hierarchy/:testSeriesUuid/questions', adminAuth, testManagementController.createQuestionInTestSeries);

// Edit and delete categories
router.put('/simple-hierarchy/categories/:categoryUuid', adminAuth, testManagementController.updateCategory);
router.delete('/simple-hierarchy/categories/:categoryUuid', adminAuth, testManagementController.deleteCategory);

// Edit and delete questions
router.put('/simple-hierarchy/questions/:questionUuid', adminAuth, testManagementController.updateQuestion);
router.delete('/simple-hierarchy/questions/:questionUuid', adminAuth, testManagementController.deleteQuestion);

// =====================
// REORDER ROUTES
// =====================

// Reorder test series display positions
router.post('/reorder', adminAuth, testManagementController.reorderTestSeries.bind(testManagementController));

// Reorder categories within a parent
router.post('/simple-hierarchy/categories/reorder', adminAuth, testManagementController.reorderCategories.bind(testManagementController));

// Reorder questions within a category
router.post('/simple-hierarchy/questions/reorder', adminAuth, testManagementController.reorderQuestions.bind(testManagementController));

// =====================
// TEST SERIES ROUTES
// =====================

// /api/admin/test-management (GET) - Get all test series
router.get('/', adminAuth, testManagementController.getTestSeries);

// /api/admin/test-management/:uuid (GET) - Get single test series by UUID
router.get('/:uuid', adminAuth, testManagementController.getTestSeriesById);

// /api/admin/test-management (POST) - Create new test series
router.post('/', adminAuth, testManagementController.createTestSeries);

// /api/admin/test-management/:uuid (PUT) - Update test series
router.put('/:uuid', adminAuth, testManagementController.updateTestSeries);

// /api/admin/test-management/:uuid (DELETE) - Delete test series
router.delete('/:uuid', adminAuth, testManagementController.deleteTestSeries);

// /api/admin/test-management/bulk (POST) - Bulk operations on test series
router.post('/bulk', adminAuth, testManagementController.bulkOperationsTestSeries);

// =====================
// CATEGORIES ROUTES
// =====================

// /api/admin/test-management/test-series/:testSeriesUuid/categories (GET) - Get categories for test series
router.get('/test-series/:testSeriesUuid/categories', adminAuth, testManagementController.getTestSeriesCategories);

// /api/admin/test-management/test-series/:testSeriesUuid/categories (POST) - Create category
router.post('/test-series/:testSeriesUuid/categories', adminAuth, testManagementController.createCategory);

// /api/admin/test-management/categories/:uuid (PUT) - Update category
router.put('/categories/:uuid', adminAuth, testManagementController.updateCategory);

// /api/admin/test-management/categories/:uuid (DELETE) - Delete category
router.delete('/categories/:uuid', adminAuth, testManagementController.deleteCategory);

// /api/admin/test-management/categories/bulk (POST) - Bulk operations on categories
router.post('/categories/bulk', adminAuth, testManagementController.bulkOperationsCategories);

// /api/admin/test-management/simple-hierarchy/categories/bulk (POST) - Bulk operations on categories for simple hierarchy
router.post('/simple-hierarchy/categories/bulk', adminAuth, testManagementController.bulkOperationsCategories);

// =====================
// SUB-CATEGORIES ROUTES
// =====================

// /api/admin/test-management/categories/:categoryUuid/sub-categories (GET) - Get sub-categories for category
router.get('/categories/:categoryUuid/sub-categories', adminAuth, testManagementController.getCategorySubCategories);

// /api/admin/test-management/categories/:categoryUuid/sub-categories (POST) - Create sub-category
router.post('/categories/:categoryUuid/sub-categories', adminAuth, testManagementController.createSubCategory);

// /api/admin/test-management/sub-categories/:uuid (PUT) - Update sub-category
router.put('/sub-categories/:uuid', adminAuth, testManagementController.updateSubCategory);

// /api/admin/test-management/sub-categories/:uuid (DELETE) - Delete sub-category
router.delete('/sub-categories/:uuid', adminAuth, testManagementController.deleteSubCategory);

// /api/admin/test-management/sub-categories/bulk (POST) - Bulk operations on sub-categories
router.post('/sub-categories/bulk', adminAuth, testManagementController.bulkOperationsSubCategories);

// =====================
// TESTS ROUTES
// =====================

// /api/admin/test-management/sub-categories/:subCategoryUuid/tests (GET) - Get tests for sub-category
router.get('/sub-categories/:subCategoryUuid/tests', adminAuth, testManagementController.getSubCategoryTests);

// /api/admin/test-management/sub-categories/:subCategoryUuid/tests (POST) - Create test
router.post('/sub-categories/:subCategoryUuid/tests', adminAuth, testManagementController.createTest);

// /api/admin/test-management/tests/:uuid (PUT) - Update test
router.put('/tests/:uuid', adminAuth, testManagementController.updateTest);

// /api/admin/test-management/tests/:uuid (DELETE) - Delete test
router.delete('/tests/:uuid', adminAuth, testManagementController.deleteTest);

// /api/admin/test-management/tests/bulk (POST) - Bulk operations on tests
router.post('/tests/bulk', adminAuth, testManagementController.bulkOperationsTests);

// =====================
// QUESTIONS ROUTES
// =====================

// /api/admin/test-management/tests/:testUuid/questions (GET) - Get questions for test
router.get('/tests/:testUuid/questions', adminAuth, testManagementController.getTestQuestions);

// /api/admin/test-management/tests/:testUuid/questions (POST) - Create question
router.post('/tests/:testUuid/questions', adminAuth, testManagementController.createQuestion);

// /api/admin/test-management/questions/:uuid (PUT) - Update question
router.put('/questions/:uuid', adminAuth, testManagementController.updateQuestion);

// /api/admin/test-management/questions/:uuid (DELETE) - Delete question
router.delete('/questions/:uuid', adminAuth, testManagementController.deleteQuestion);

// /api/admin/test-management/questions/bulk (POST) - Bulk operations on questions
router.post('/questions/bulk', adminAuth, testManagementController.bulkOperationsQuestions);

// /api/admin/test-management/simple-hierarchy/questions/bulk (POST) - Bulk operations on questions for simple hierarchy
router.post('/simple-hierarchy/questions/bulk', adminAuth, testManagementController.bulkOperationsQuestions);

module.exports = router;