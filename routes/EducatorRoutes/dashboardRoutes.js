const express = require('express');
const router = express.Router();

const educatorDashboardController = require('../../controllers/EducatorController/educatorDashboardController');
const { educatorAuth } = require('../../utils/EducatorAuth');

router.get('/stats', educatorAuth, educatorDashboardController.getDashboardStats);

module.exports = router;
