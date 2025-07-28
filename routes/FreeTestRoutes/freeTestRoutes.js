const express = require('express');
const router = express.Router();
const freeTestsController = require('../../controllers/FreeTestsController');

// Public routes (no authentication required)
router.get('/', freeTestsController.getFreeTests);
router.get('/categories', freeTestsController.getFreeTestCategories);
router.get('/stats', freeTestsController.getFreeTestStats);
router.get('/:id', freeTestsController.getFreeTestById);

module.exports = router;