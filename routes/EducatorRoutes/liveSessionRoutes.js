const express = require('express');
const router = express.Router();

const liveSessionController = require('../../controllers/EducatorController/liveSessionController');
const { educatorAuth } = require('../../utils/EducatorAuth');

router.use(educatorAuth);

router.get('/', liveSessionController.listMySessions);
router.post('/', liveSessionController.createSession);
router.put('/:uuid', liveSessionController.updateSession);
router.patch('/:uuid/cancel', liveSessionController.cancelSession);
router.get('/:uuid/attendance', liveSessionController.getAttendanceReport);

module.exports = router;
