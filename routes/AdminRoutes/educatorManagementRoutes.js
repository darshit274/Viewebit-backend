const express = require('express');
const router = express.Router();

const educatorManagementController = require('../../controllers/AdminController/educatorManagementController');
const { adminAuth, requireRole } = require('../../utils/AdminAuth');

router.get('/', adminAuth, educatorManagementController.getEducators);
router.get('/:id', adminAuth, educatorManagementController.getEducatorById);
router.post('/', adminAuth, requireRole(['super_admin', 'institution_admin', 'branch_admin']), educatorManagementController.createEducator);
router.put('/:id', adminAuth, requireRole(['super_admin', 'institution_admin', 'branch_admin']), educatorManagementController.updateEducator);
router.patch('/:id/toggle-status', adminAuth, requireRole(['super_admin', 'institution_admin', 'branch_admin']), educatorManagementController.deactivateEducator);

module.exports = router;
