const express = require('express');
const router = express.Router();

const roleController = require('../../controllers/AdminController/roleController');
const { adminAuth, requireRole } = require('../../utils/AdminAuth');

router.get('/', adminAuth, roleController.getAdmins);
router.get('/available', adminAuth, roleController.getAvailableRoles);
router.patch('/:id', adminAuth, requireRole(['super_admin']), roleController.updateAdminRole);

module.exports = router;
