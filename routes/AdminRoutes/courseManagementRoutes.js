const express = require('express');
const router = express.Router();

const courseManagementController = require('../../controllers/AdminController/courseManagementController');
const { adminAuth, requireRole } = require('../../utils/AdminAuth');

router.get('/', adminAuth, courseManagementController.getCourses);
router.put('/:uuid/price', adminAuth, requireRole(['super_admin', 'institution_admin', 'branch_admin']), courseManagementController.setCoursePrice);

module.exports = router;
