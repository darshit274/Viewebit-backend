const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/AdminController/uploadController');
const { adminAuth } = require('../utils/AdminAuth');

// Apply admin authentication middleware to all routes
router.use(adminAuth);

// Upload image for rich text editor
router.post('/image', uploadController.uploadEditorImage);

// Delete uploaded image
router.delete('/image/:filename', uploadController.deleteEditorImage);

// Get list of uploaded images
router.get('/images', uploadController.getEditorImages);

module.exports = router;