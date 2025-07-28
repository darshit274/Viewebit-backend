const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/NotificationController.js');
const { authToken, isAdmin } = require('../utils/AuthToken');

// Public routes (require authentication)
router.use(authToken);

// User routes - Register push token
router.post('/register-push-token', notificationController.registerPushToken);

// User routes - Get user's notifications
router.get('/my-notifications', notificationController.getUserNotifications);

// User routes - Mark notification as read
router.put('/mark-read/:notificationId', notificationController.markNotificationAsRead);

// Admin routes
router.use(isAdmin); // All routes below require admin privileges

// Admin - Send notification to specific user
router.post('/send-to-user', notificationController.sendNotificationToUser);

// Admin - Send broadcast notification
router.post('/send-broadcast', notificationController.sendBroadcastNotification);

// Admin - Get notification statistics
router.get('/stats', notificationController.getNotificationStats);

// Admin - Send test notification
router.post('/send-test', notificationController.sendTestNotification);

// Specialized notification endpoints
router.post('/quiz-reminder', notificationController.sendQuizReminder);
router.post('/test-result', notificationController.sendTestResultNotification);
router.post('/new-content', notificationController.sendNewContentNotification);

module.exports = router;