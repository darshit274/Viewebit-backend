const express = require('express');
const router = express.Router();

const educatorAuthController = require('../../controllers/EducatorController/educatorAuthController');
const { educatorAuth } = require('../../utils/EducatorAuth');

// Public routes (no authentication required)
router.post('/login', educatorAuthController.login);
router.post('/verify-otp', educatorAuthController.verifyOTP);
router.post('/resend-otp', educatorAuthController.resendOTP);

// Protected routes (authentication required)
router.post('/logout', educatorAuth, educatorAuthController.logout);
router.get('/profile', educatorAuth, educatorAuthController.getProfile);

module.exports = router;
