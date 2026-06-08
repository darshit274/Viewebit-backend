/**
 * Admin PDF hierarchy routes — mounted at /api/admin/pdf-hierarchy.
 * Mirrors the /admin/test-management/simple-hierarchy/* surface.
 */
const express = require('express');
const router = express.Router();
const pdfHierarchyController = require('../../controllers/AdminController/pdfHierarchyController');
const { adminAuth } = require('../../utils/AdminAuth');
const { handlePDFUpload } = require('../../utils/pdfUpload');

// ===== REORDER (must come before /:uuid routes) =====
router.patch('/categories/reorder', adminAuth, pdfHierarchyController.reorderCategories);
router.patch('/pdfs/reorder', adminAuth, pdfHierarchyController.reorderPdfs);

// ===== CATEGORIES =====
router.get('/roots', adminAuth, pdfHierarchyController.getRootCategories);
router.get('/categories/:categoryUuid', adminAuth, pdfHierarchyController.getCategoryContent);
router.post('/categories', adminAuth, pdfHierarchyController.createCategory);                                  // root
router.post('/categories/:parentUuid/subcategories', adminAuth, pdfHierarchyController.createCategory);        // sub
router.put('/categories/:categoryUuid', adminAuth, pdfHierarchyController.updateCategory);
router.delete('/categories/:categoryUuid', adminAuth, pdfHierarchyController.deleteCategory);

// ===== PDF UPLOAD + EDIT + DELETE (live inside hierarchy, not in a separate library) =====
router.post(
  '/categories/:categoryUuid/upload',
  adminAuth,
  handlePDFUpload,
  pdfHierarchyController.uploadPdfToCategory
);
router.put('/pdfs/:pdfId', adminAuth, pdfHierarchyController.updatePdfMetadata);
router.delete('/pdfs/:pdfId', adminAuth, pdfHierarchyController.deletePdf);

// Legacy helpers (kept for backward compat, the UI no longer uses these)
router.post('/categories/:categoryUuid/attach-pdf', adminAuth, pdfHierarchyController.attachPdfToCategory);
router.delete('/pdfs/:pdfId/detach', adminAuth, pdfHierarchyController.detachPdfFromCategory);

module.exports = router;
