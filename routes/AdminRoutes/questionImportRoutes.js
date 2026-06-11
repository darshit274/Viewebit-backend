const express = require('express');
const router = express.Router();
const questionImportController = require('../../controllers/AdminController/questionImportController');
const { adminAuth } = require('../../utils/AdminAuth');

// Template download routes
router.get('/template/:format', adminAuth, questionImportController.downloadTemplate);

// File upload and validation
router.post('/upload', adminAuth, questionImportController.uploadImportFile);

// Import status and management
router.get('/status/:import_id', adminAuth, questionImportController.getImportStatus);
router.get('/preview/:import_id', adminAuth, questionImportController.previewImport);
router.post('/confirm/:import_id', adminAuth, questionImportController.confirmImport);

// Import history
router.get('/history', adminAuth, questionImportController.getImportHistory);

module.exports = router;