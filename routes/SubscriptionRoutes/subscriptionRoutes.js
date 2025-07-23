const express = require('express');
const router = express.Router();
const subscriptionController = require('../../controllers/SubscriptionController/subscriptionController');
const { authToken } = require('../../utils/AuthToken');
const { adminAuth } = require('../../utils/AdminAuth');

// User routes (authentication required)
router.get('/my-subscriptions', authToken, subscriptionController.getUserSubscriptions);
router.get('/my-subscriptions/stats', authToken, subscriptionController.getUserSubscriptionStats);
router.get('/my-subscriptions/:id', authToken, subscriptionController.getSubscriptionDetails);
router.post('/purchase', authToken, subscriptionController.createSubscription);
router.get('/check/:testSeriesId', authToken, subscriptionController.checkSubscriptionStatus);
router.post('/cancel/:id', authToken, subscriptionController.cancelSubscription);

// Admin routes
router.get('/all', adminAuth, subscriptionController.getAllSubscriptions);
router.patch('/:id/status', adminAuth, subscriptionController.updateSubscriptionStatus);

module.exports = router;