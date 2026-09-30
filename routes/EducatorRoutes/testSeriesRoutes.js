const express = require('express');
const router = express.Router();

const testSeriesController = require('../../controllers/EducatorController/testSeriesController');
const { educatorAuth } = require('../../utils/EducatorAuth');

router.use(educatorAuth);

router.get('/', testSeriesController.listMyTestSeries);
router.post('/', testSeriesController.createTestSeries);
router.put('/:uuid', testSeriesController.updateTestSeries);
router.delete('/:uuid', testSeriesController.deleteTestSeries);

module.exports = router;
