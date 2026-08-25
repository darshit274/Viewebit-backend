const express = require('express');
const router = express.Router();

const pdfHierarchyController = require('../../controllers/EducatorController/pdfHierarchyController');
const { educatorAuth } = require('../../utils/EducatorAuth');
const { handlePDFUpload } = require('../../utils/pdfUpload');

router.use(educatorAuth);

router.get('/roots', pdfHierarchyController.getRootCategories);
router.get('/categories/:categoryUuid', pdfHierarchyController.getCategoryContent);
router.post('/categories', pdfHierarchyController.createCategory);
router.post('/categories/:parentUuid/subcategories', pdfHierarchyController.createCategory);
router.put('/categories/:categoryUuid', pdfHierarchyController.updateCategory);
router.delete('/categories/:categoryUuid', pdfHierarchyController.deleteCategory);

router.post('/categories/:categoryUuid/upload', handlePDFUpload, pdfHierarchyController.uploadPdf);
router.put('/pdfs/:pdfId', pdfHierarchyController.updatePdfMetadata);
router.delete('/pdfs/:pdfId', pdfHierarchyController.deletePdf);

module.exports = router;
