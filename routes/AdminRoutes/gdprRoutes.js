const express = require('express');
const router = express.Router();

const gdprController = require('../../controllers/AdminController/gdprController');
const { adminAuth, requireRole } = require('../../utils/AdminAuth');

router.use(adminAuth, requireRole(['super_admin', 'institution_admin']));

router.get('/search', gdprController.searchSubject);
router.get('/requests', gdprController.listRequests);
router.get('/:subjectType/:uuid/export', gdprController.exportSubject);
router.post('/:subjectType/:uuid/anonymize', gdprController.anonymizeSubject);

module.exports = router;
