const express = require('express');
const router = express.Router();

const studentLiveSessionController = require('../../controllers/LiveSessionController/studentLiveSessionController');
const { authToken, optionalAuth } = require('../../utils/AuthToken');

router.get('/', optionalAuth, studentLiveSessionController.listUpcoming);
router.get('/:uuid', optionalAuth, studentLiveSessionController.getSessionDetail);
router.post('/:uuid/join', authToken, studentLiveSessionController.joinSession);
router.post('/:uuid/leave', authToken, studentLiveSessionController.leaveSession);

module.exports = router;
