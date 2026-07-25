const express = require('express');
const router = express.Router();

const courseManagementController = require('../../controllers/AdminController/courseManagementController');
const { adminAuth } = require('../../utils/AdminAuth');

router.get('/', adminAuth, courseManagementController.getCourses);
router.put('/:uuid/price', adminAuth, courseManagementController.setCoursePrice);

module.exports = router;
