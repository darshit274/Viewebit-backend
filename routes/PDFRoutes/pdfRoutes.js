const express = require('express');
const router = express.Router();
const pdfController = require('../../controllers/AdminController/pdfController');
const { authToken } = require('../../utils/AuthToken');

// Public routes (no auth required)
router.get('/', pdfController.getPdfs);
router.get('/filters', pdfController.getPdfFilters);
router.get('/stats', pdfController.getPdfStats);
router.get('/:id', pdfController.getPdfById);

// Protected routes (require user authentication)
router.get('/:id/download', authToken, pdfController.getPdfDownloadUrl);
router.post('/:id/view', authToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Here you could track user views in a separate table
    // For now, we'll just increment the view count
    const { Pdfs } = require('../../models');
    const pdf = await Pdfs.findByPk(id);
    
    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    await pdf.increment('view_count');

    res.status(200).json({
      success: true,
      message: 'View count updated'
    });
  } catch (error) {
    console.error('Error updating view count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update view count'
    });
  }
});

module.exports = router;