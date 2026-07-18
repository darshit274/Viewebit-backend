const express = require('express');
const router = express.Router();

const branchController = require('../../controllers/AdminController/branchController');
const { adminAuth, requireRole } = require('../../utils/AdminAuth');

router.get('/', adminAuth, branchController.getBranches);
router.get('/dropdown', adminAuth, branchController.getBranchesForDropdown);
router.get('/:id', adminAuth, branchController.getBranchById);
router.post('/', adminAuth, requireRole(['super_admin', 'institution_admin']), branchController.createBranch);
router.put('/:id', adminAuth, requireRole(['super_admin', 'institution_admin']), branchController.updateBranch);
router.patch('/:id/toggle-status', adminAuth, requireRole(['super_admin', 'institution_admin']), branchController.toggleBranchStatus);
router.delete('/:id', adminAuth, requireRole(['super_admin', 'institution_admin']), branchController.deleteBranch);

module.exports = router;
