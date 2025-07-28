const express = require('express');
const router = express.Router();
const testSeriesPublicController = require('../../controllers/TestSeriesPublicController');

// Public routes (no authentication required)
router.get('/', testSeriesPublicController.getTestSeries);
router.get('/categories', testSeriesPublicController.getTestSeriesCategories);
router.get('/stats', testSeriesPublicController.getTestSeriesStats);
router.get('/:id', testSeriesPublicController.getTestSeriesById);
router.get('/:seriesId/tests', testSeriesPublicController.getSeriesTests);

module.exports = router;