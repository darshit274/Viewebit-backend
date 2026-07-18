const express = require('express');
const router = express.Router();

const studentLiveSessionController = require('../../controllers/LiveSessionController/studentLiveSessionController');
const { authToken } = require('../../utils/AuthToken');

router.get('/', studentLiveSessionController.listUpcoming);
router.get('/:uuid', studentLiveSessionController.getSessionDetail);
router.post('/:uuid/join', authToken, studentLiveSessionController.joinSession);
router.post('/:uuid/leave', authToken, studentLiveSessionController.leaveSession);

module.exports = router;
