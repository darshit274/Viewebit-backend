const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const authenticateToken = require('../middleware/authMiddleware'); // JWT authentication middleware

// Dashboard stats endpoint
router.get('/stats', authenticateToken, DashboardController.getDashboardStats);

// User summary endpoint  
router.get('/user-summary', authenticateToken, DashboardController.getUserSummary);

module.exports = router;