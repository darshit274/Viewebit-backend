const express = require('express');
const router = express.Router();

const adminController = require('../../controllers/AdminController/adminController');
const questionsController = require('../../controllers/AdminController/questionsController');
const pdfController = require('../../controllers/AdminController/pdfController');
const examTypesController = require('../../controllers/AdminController/examTypesController');
const categoriesController = require('../../controllers/AdminController/categoriesController');
const notificationController = require('../../controllers/AdminController/notificationController');
const { adminAuth, requireRole } = require('../../utils/AdminAuth');

// Public routes (no authentication required)
router.post('/login', adminController.login);

// Protected routes (authentication required)
router.post('/logout', adminAuth, adminController.logout);
router.get('/profile', adminAuth, adminController.getProfile);
router.get('/dashboard/stats', adminAuth, adminController.getDashboardStats);

// Analytics routes
router.get('/analytics/registrations', adminAuth, adminController.getRegistrationAnalytics);
router.get('/analytics/test-attempts', adminAuth, adminController.getTestAttemptAnalytics);
router.get('/analytics/categories', adminAuth, adminController.getCategoryAnalytics);
router.get('/analytics/recent-activity', adminAuth, adminController.getRecentActivity);

// Student management routes (alias for users)
router.get('/students', adminAuth, adminController.getStudents);
router.get('/students/:id', adminAuth, adminController.getStudentById);
router.post('/students', adminAuth, adminController.createStudent);
router.put('/students/:id', adminAuth, adminController.updateStudent);
router.delete('/students/:id', adminAuth, adminController.deleteStudent);

// User management routes (same as students, for frontend compatibility)
router.get('/users', adminAuth, adminController.getStudents);
router.get('/users/stats', adminAuth, adminController.getUserStats);
router.get('/users/:id', adminAuth, adminController.getStudentById);
router.post('/users', adminAuth, adminController.createStudent);
router.put('/users/:id', adminAuth, adminController.updateStudent);
router.delete('/users/:id', adminAuth, adminController.deleteStudent);
router.patch('/users/:id/toggle-status', adminAuth, adminController.toggleUserStatus);
router.patch('/users/:id/verify', adminAuth, adminController.verifyUser);
router.patch('/users/:id/toggle-premium', adminAuth, adminController.toggleUserPremium);


// Questions management routes
router.get('/questions', adminAuth, questionsController.getQuestions);
router.get('/questions/stats', adminAuth, questionsController.getQuestionsStats);
router.get('/questions/filters', adminAuth, questionsController.getQuestionFilters);
router.get('/questions/:id', adminAuth, questionsController.getQuestionById);
router.post('/questions', adminAuth, questionsController.createQuestion);
router.post('/questions/bulk', adminAuth, questionsController.bulkCreateQuestions);
router.put('/questions/:id', adminAuth, questionsController.updateQuestion);
router.delete('/questions/:id', adminAuth, questionsController.deleteQuestion);

// PDF management routes
router.get('/pdfs', adminAuth, pdfController.getPdfs);
router.get('/pdfs/stats', adminAuth, pdfController.getPdfStats);
router.get('/pdfs/filters', adminAuth, pdfController.getPdfFilters);
router.get('/pdfs/:id', adminAuth, pdfController.getPdfById);
router.get('/pdfs/:id/download', adminAuth, pdfController.getPdfDownloadUrl);
router.post('/pdfs', adminAuth, pdfController.createPdf);
router.post('/pdfs/upload', adminAuth, pdfController.uploadPdf);
router.put('/pdfs/:id', adminAuth, pdfController.updatePdf);
router.delete('/pdfs/:id', adminAuth, pdfController.deletePdf);

// PDF list route (backward compatibility)
router.get('/pdf/list', adminAuth, pdfController.getPdfs);


// Exam Types management routes
router.get('/exam-types', adminAuth, examTypesController.getExamTypes);
router.get('/exam-types/dropdown', adminAuth, examTypesController.getExamTypesForDropdown);
router.get('/exam-types/:id', adminAuth, examTypesController.getExamTypeById);
router.post('/exam-types', adminAuth, examTypesController.createExamType);
router.put('/exam-types/:id', adminAuth, examTypesController.updateExamType);
router.delete('/exam-types/:id', adminAuth, examTypesController.deleteExamType);

// Categories management routes
router.get('/categories', adminAuth, categoriesController.getCategories);
router.get('/categories/stats', adminAuth, categoriesController.getCategoryStats);
router.get('/categories/dropdown', adminAuth, categoriesController.getCategoriesForDropdown);
router.get('/categories/:id', adminAuth, categoriesController.getCategoryById);
router.post('/categories', adminAuth, categoriesController.createCategory);
router.put('/categories/:id', adminAuth, categoriesController.updateCategory);
router.delete('/categories/:id', adminAuth, categoriesController.deleteCategory);
router.patch('/categories/:id/toggle-status', adminAuth, categoriesController.toggleCategoryStatus);

// Notification management routes
router.get('/notifications/stats', adminAuth, notificationController.getNotificationStats);
router.get('/notifications/history', adminAuth, notificationController.getNotificationHistory);
router.post('/notifications/broadcast', adminAuth, notificationController.sendBroadcastNotification);
router.post('/notifications/targeted', adminAuth, notificationController.sendTargetedNotification);
router.post('/notifications/trigger-content', adminAuth, notificationController.triggerNewContentNotification);
router.post('/notifications/schedule', adminAuth, notificationController.scheduleNotification);
router.delete('/notifications/schedule/:jobId', adminAuth, notificationController.cancelScheduledNotification);
router.post('/notifications/test', adminAuth, notificationController.sendTestNotification);

// Subscription management routes (admin access)
const subscriptionController = require('../../controllers/SubscriptionController/subscriptionController');
router.get('/subscriptions/stats', adminAuth, subscriptionController.getSubscriptionStats);
router.get('/subscriptions/export', adminAuth, subscriptionController.exportSubscriptions);
router.post('/subscriptions/manual', adminAuth, subscriptionController.createManualSubscription);

// PDF Upload management routes
const pdfUploadRoutes = require('./pdfUploadRoutes');
router.use('/pdf', pdfUploadRoutes);

// PYQ management routes
const pyqRoutes = require('./pyqRoutes');
router.use('/pyqs', pyqRoutes);

// Translation management routes
const translationRoutes = require('./translationRoutes');
router.use('/translations', translationRoutes);

// Test management routes (new system)
const testManagementRoutes = require('./testManagementRoutes');
router.use('/test-management', testManagementRoutes);

// Test management routes (direct access - backward compatible)
const testManagementController = require('../../controllers/AdminController/TestManagementController');

// Exam Categories
router.get('/exam-categories', adminAuth, testManagementController.getExamCategories);
router.post('/exam-categories', adminAuth, testManagementController.createExamCategory);
router.put('/exam-categories/:id', adminAuth, testManagementController.updateExamCategory);
router.delete('/exam-categories/:id', adminAuth, testManagementController.deleteExamCategory);

// Test Series (new system)
router.get('/test-series-new', adminAuth, testManagementController.getTestSeries);
router.get('/test-series-new/:id', adminAuth, testManagementController.getTestSeriesById);
router.post('/test-series-new', adminAuth, testManagementController.createTestSeries);
router.put('/test-series-new/:id', adminAuth, testManagementController.updateTestSeries);
router.delete('/test-series-new/:id', adminAuth, testManagementController.deleteTestSeries);
router.patch('/test-series-new/:id/publish', adminAuth, testManagementController.togglePublishStatus);

// Test Series (backward compatibility for old frontend endpoints)
router.get('/test-series', adminAuth, testManagementController.getTestSeries);
router.get('/test-series/stats', adminAuth, testManagementController.getTestSeriesStats);
router.get('/test-series/:id', adminAuth, testManagementController.getTestSeriesById);
router.post('/test-series', adminAuth, testManagementController.createTestSeries);
router.put('/test-series/:id', adminAuth, testManagementController.updateTestSeries);
router.delete('/test-series/:id', adminAuth, testManagementController.deleteTestSeries);

// Performance analytics
router.get('/performance', adminAuth, testManagementController.getPerformanceAnalytics);

// Tests (new system)
router.get('/test-series-new/:seriesId/tests', adminAuth, testManagementController.getTestsForSeries);
router.post('/test-series-new/:seriesId/tests', adminAuth, testManagementController.createTest);
router.put('/tests-new/:testId', adminAuth, testManagementController.updateTest);
router.delete('/tests-new/:testId', adminAuth, testManagementController.deleteTest);

// Questions (new system)
router.get('/tests-new/:testId/questions', adminAuth, testManagementController.getQuestionsForTest);
router.post('/tests-new/:testId/questions', adminAuth, testManagementController.createQuestion);
router.put('/questions-new/:questionId', adminAuth, testManagementController.updateQuestion);
router.delete('/questions-new/:questionId', adminAuth, testManagementController.deleteQuestion);

// Admin management routes (super admin only)
router.post('/create', adminAuth, requireRole(['super_admin']), adminController.createAdmin);

module.exports = router;