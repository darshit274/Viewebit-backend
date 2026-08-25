const express = require('express');
const router = express.Router();

const departmentController = require('../../controllers/AdminController/departmentController');
const { adminAuth, requireRole } = require('../../utils/AdminAuth');

router.get('/', adminAuth, departmentController.getDepartments);
router.get('/dropdown', adminAuth, departmentController.getDepartmentsForDropdown);
router.get('/:id', adminAuth, departmentController.getDepartmentById);
router.post('/', adminAuth, requireRole(['super_admin', 'institution_admin', 'branch_admin']), departmentController.createDepartment);
router.put('/:id', adminAuth, requireRole(['super_admin', 'institution_admin', 'branch_admin']), departmentController.updateDepartment);
router.patch('/:id/toggle-status', adminAuth, requireRole(['super_admin', 'institution_admin', 'branch_admin']), departmentController.toggleDepartmentStatus);
router.delete('/:id', adminAuth, requireRole(['super_admin', 'institution_admin', 'branch_admin']), departmentController.deleteDepartment);

module.exports = router;
