const express = require('express');
const router = express.Router();

const institutionController = require('../../controllers/AdminController/institutionController');
const { adminAuth, requireRole } = require('../../utils/AdminAuth');

router.get('/', adminAuth, institutionController.getInstitutions);
router.get('/dropdown', adminAuth, institutionController.getInstitutionsForDropdown);
router.get('/:id', adminAuth, institutionController.getInstitutionById);
router.post('/', adminAuth, requireRole(['super_admin']), institutionController.createInstitution);
router.put('/:id', adminAuth, requireRole(['super_admin']), institutionController.updateInstitution);
router.delete('/:id', adminAuth, requireRole(['super_admin']), institutionController.deleteInstitution);

module.exports = router;
