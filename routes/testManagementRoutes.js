const express = require('express');
const router = express.Router();
const testManagementController = require('../controllers/TestManagementController');
const { adminAuth } = require('../utils/AdminAuth');

// =====================
// TEST SERIES ROUTES
// =====================

// /api/admin/test-management (GET) - Get all test series
router.get('/', adminAuth, testManagementController.getTestSeries);

// /api/admin/test-management (POST) - Create new test series
router.post('/', adminAuth, testManagementController.createTestSeries);

// /api/admin/test-management/:uuid (PUT) - Update test series
router.put('/:uuid', adminAuth, testManagementController.updateTestSeries);

// /api/admin/test-management/:uuid (DELETE) - Delete test series
router.delete('/:uuid', adminAuth, testManagementController.deleteTestSeries);

// =====================
// CATEGORIES ROUTES
// =====================

// /api/admin/test-management/test-series/:testSeriesUuid (GET) - Get categories for test series
router.get('/test-series/:testSeriesUuid', adminAuth, testManagementController.getTestSeriesCategories);

// /api/admin/test-management/test-series/:testSeriesUuid/categories (POST) - Create category
router.post('/test-series/:testSeriesUuid/categories', adminAuth, testManagementController.createCategory);

// /api/admin/test-management/categories/:uuid (PUT) - Update category
router.put('/categories/:uuid', adminAuth, testManagementController.updateCategory);

// /api/admin/test-management/categories/:uuid (DELETE) - Delete category
router.delete('/categories/:uuid', adminAuth, testManagementController.deleteCategory);

// =====================
// SUB-CATEGORIES ROUTES
// =====================

// /api/admin/test-management/categories/:categoryUuid (GET) - Get sub-categories for category
router.get('/categories/:categoryUuid', adminAuth, testManagementController.getCategorySubCategories);

// /api/admin/test-management/categories/:categoryUuid/sub-categories (POST) - Create sub-category
router.post('/categories/:categoryUuid/sub-categories', adminAuth, testManagementController.createSubCategory);

// /api/admin/test-management/sub-categories/:uuid (PUT) - Update sub-category
router.put('/sub-categories/:uuid', adminAuth, testManagementController.updateSubCategory);

// /api/admin/test-management/sub-categories/:uuid (DELETE) - Delete sub-category
router.delete('/sub-categories/:uuid', adminAuth, testManagementController.deleteSubCategory);

// =====================
// TESTS ROUTES
// =====================

// /api/admin/test-management/sub-categories/:subCategoryUuid (GET) - Get tests for sub-category
router.get('/sub-categories/:subCategoryUuid', adminAuth, testManagementController.getSubCategoryTests);

// /api/admin/test-management/sub-categories/:subCategoryUuid/tests (POST) - Create test
router.post('/sub-categories/:subCategoryUuid/tests', adminAuth, testManagementController.createTest);

// /api/admin/test-management/tests/:uuid (PUT) - Update test
router.put('/tests/:uuid', adminAuth, testManagementController.updateTest);

// /api/admin/test-management/tests/:uuid (DELETE) - Delete test
router.delete('/tests/:uuid', adminAuth, testManagementController.deleteTest);

// =====================
// QUESTIONS ROUTES
// =====================

// /api/admin/test-management/tests/:testUuid (GET) - Get questions for test
router.get('/tests/:testUuid', adminAuth, testManagementController.getTestQuestions);

// /api/admin/test-management/tests/:testUuid/questions (POST) - Create question
router.post('/tests/:testUuid/questions', adminAuth, testManagementController.createQuestion);

// /api/admin/test-management/questions/:uuid (PUT) - Update question
router.put('/questions/:uuid', adminAuth, testManagementController.updateQuestion);

// /api/admin/test-management/questions/:uuid (DELETE) - Delete question
router.delete('/questions/:uuid', adminAuth, testManagementController.deleteQuestion);

module.exports = router;