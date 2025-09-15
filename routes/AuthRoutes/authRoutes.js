const express = require('express');
const router = express.Router();

const authController = require('../../controllers/AuthController/authController');
const notificationController = require('../../controllers/NotificationController');
const { authToken } = require('../../utils/AuthToken');

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/otp-verify', authController.otp_verify);
router.post('/forgotPassword', authController.forgotPassword);
router.post('/resetPassword', authController.resetPassword);
router.post('/resend-otp', authController.resendOTP);

// Protected routes (authentication required)
router.get('/profile', authToken, authController.getProfile);
router.post('/change-password', authToken, authController.changePassword);
router.post('/register-push-token', authToken, notificationController.registerPushToken);

module.exports = router;