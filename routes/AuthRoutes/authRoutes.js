const express = require('express');
const router = express.Router();

const authController = require('../../controllers/AuthController/authController');
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

module.exports = router;