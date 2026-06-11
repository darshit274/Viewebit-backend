const express = require('express');
const router = express.Router();
const WebPDFController = require('../controllers/WebPDFController');
const authenticateToken = require('../middleware/authMiddleware');

// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
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
    next();
  }
};

// Web app compatible PDF routes - ALL REQUIRE AUTHENTICATION FOR SECURITY
router.get('/', authenticateToken, WebPDFController.getPDFs);
router.get('/:id/download', authenticateToken, WebPDFController.downloadPDF);
router.get('/:id/preview', authenticateToken, WebPDFController.previewPDF);
router.get('/:id/view', authenticateToken, WebPDFController.viewPDF);
router.get('/:id/file', WebPDFController.servePDFFile);

// Test authentication endpoint
router.get('/auth-test', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Simple PDF viewing - no authentication required
router.get('/:id/secure-view', WebPDFController.secureViewPDF);

module.exports = router;