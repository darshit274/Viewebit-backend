const express = require('express');
const router = express.Router();
const freeTestController = require('../../controllers/AdminController/freeTestController');
const { isAdmin } = require('../../utils/AuthToken');

// All routes require admin authentication
router.use(isAdmin);

// CRUD operations
router.get('/', freeTestController.getFreeTests);
router.get('/stats', freeTestController.getFreeTestStats);
router.get('/:id', freeTestController.getFreeTestById);
router.post('/', freeTestController.createFreeTest);
router.put('/:id', freeTestController.updateFreeTest);
router.delete('/:id', freeTestController.deleteFreeTest);

// Status management
router.patch('/:id/toggle-status', freeTestController.toggleFreeTestStatus);
router.patch('/:id/toggle-featured', freeTestController.toggleFeaturedStatus);

// Bulk operations
router.post('/bulk-update', freeTestController.bulkUpdateFreeTests);

module.exports = router;