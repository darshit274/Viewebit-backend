const express = require('express');
const router = express.Router();

const adminController = require('../../controllers/AdminController/adminController');
const testSeriesController = require('../../controllers/AdminController/testSeriesController');
const questionsController = require('../../controllers/AdminController/questionsController');
const pdfController = require('../../controllers/AdminController/pdfController');
const examTypesController = require('../../controllers/AdminController/examTypesController');
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

// Student management routes
router.get('/students', adminAuth, adminController.getStudents);
router.get('/students/:id', adminAuth, adminController.getStudentById);
router.post('/students', adminAuth, adminController.createStudent);
router.put('/students/:id', adminAuth, adminController.updateStudent);
router.delete('/students/:id', adminAuth, adminController.deleteStudent);

// Test Series management routes
router.get('/test-series', adminAuth, testSeriesController.getTestSeries);
router.get('/test-series/stats', adminAuth, testSeriesController.getTestSeriesStats);
router.get('/test-series/:id', adminAuth, testSeriesController.getTestSeriesById);
router.post('/test-series', adminAuth, testSeriesController.createTestSeries);
router.put('/test-series/:id', adminAuth, testSeriesController.updateTestSeries);
router.delete('/test-series/:id', adminAuth, testSeriesController.deleteTestSeries);
router.patch('/test-series/:id/toggle-status', adminAuth, testSeriesController.toggleTestSeriesStatus);

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

// Exam Types management routes
router.get('/exam-types', adminAuth, examTypesController.getExamTypes);
router.get('/exam-types/dropdown', adminAuth, examTypesController.getExamTypesForDropdown);
router.get('/exam-types/:id', adminAuth, examTypesController.getExamTypeById);
router.post('/exam-types', adminAuth, examTypesController.createExamType);
router.put('/exam-types/:id', adminAuth, examTypesController.updateExamType);
router.delete('/exam-types/:id', adminAuth, examTypesController.deleteExamType);

// Subscription management routes (admin access)
const subscriptionController = require('../../controllers/SubscriptionController/subscriptionController');
router.get('/subscriptions/stats', adminAuth, subscriptionController.getSubscriptionStats);
router.get('/subscriptions/export', adminAuth, subscriptionController.exportSubscriptions);
router.post('/subscriptions/manual', adminAuth, subscriptionController.createManualSubscription);

// PDF Upload management routes
const pdfUploadRoutes = require('./pdfUploadRoutes');
router.use('/pdf', pdfUploadRoutes);

// Admin management routes (super admin only)
router.post('/create', adminAuth, requireRole(['super_admin']), adminController.createAdmin);

module.exports = router;