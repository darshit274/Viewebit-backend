const express = require('express');
const router = express.Router();

const authController = require('../../controllers/AuthController/authController');

router.post('/register', authController.register);

router.post('/login', authController.login);

router.post('/otp-verify', authController.otp_verify);

router.post('/forgotPassword', authController.forgotPassword);

router.post('/resetPassword', authController.resetPassword);
module.exports = router;