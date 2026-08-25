const express = require('express');
const router = express.Router();

const admissionsController = require('../../controllers/AdminController/admissionsController');
const { adminAuth } = require('../../utils/AdminAuth');

router.get('/', adminAuth, admissionsController.getAdmissions);
router.get('/stats', adminAuth, admissionsController.getAdmissionStats);
router.patch('/:id/status', adminAuth, admissionsController.updateAdmissionStatus);

module.exports = router;
