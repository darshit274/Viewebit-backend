const express = require('express');
const router = express.Router();
const pdfUploadController = require('../../controllers/AdminController/pdfUploadController');
const { adminAuth } = require('../../utils/AdminAuth');

// PDF Categories routes
router.get('/categories', adminAuth, pdfUploadController.getPdfCategories);
router.post('/categories', adminAuth, pdfUploadController.createPdfCategory);

// PDF Upload routes
router.post('/upload', adminAuth, pdfUploadController.uploadPdf);
router.get('/list', adminAuth, pdfUploadController.getPdfs);
router.get('/stats', adminAuth, pdfUploadController.getPdfStats);
router.get('/:id', adminAuth, pdfUploadController.getPdfById);
router.put('/:id', adminAuth, pdfUploadController.updatePdf);
router.delete('/:id', adminAuth, pdfUploadController.deletePdf);
router.get('/:id/download', adminAuth, pdfUploadController.downloadPdf);

module.exports = router;