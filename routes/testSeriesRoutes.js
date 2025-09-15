const express = require('express');
const router = express.Router();
const TestSeriesController = require('../controllers/TestSeriesController');
const authenticateToken = require('../middleware/authMiddleware'); // JWT authentication middleware

// Optional authentication middleware - continues without auth if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      // Reuse the existing auth middleware logic but don't fail if invalid
      const AuthToken = require('../utils/AuthToken');
      const User = require('../models/User');
      
      const decoded = AuthToken.verifyToken(token);
      const user = await User.findOne({ where: { uuid: decoded.id } });
      
      if (user) {
        req.user = {
          ...user.toJSON(),
          id: user.id,
          uuid: user.uuid
        };
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Test series endpoints (for web app compatibility)
router.get('/series', optionalAuth, TestSeriesController.getTestSeries);
router.get('/series/:id', optionalAuth, TestSeriesController.getTestSeriesDetails);
router.get('/featured', optionalAuth, TestSeriesController.getFeaturedTestSeries);

// Free tests endpoint
router.get('/free', optionalAuth, TestSeriesController.getFreeTests);

module.exports = router;