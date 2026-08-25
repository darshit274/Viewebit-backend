const express = require('express');
const router = express.Router();

const studentAssignmentController = require('../../controllers/AssignmentController/studentAssignmentController');
const { authToken } = require('../../utils/AuthToken');

router.use(authToken);

router.get('/', studentAssignmentController.listMyAssignments);
router.get('/:uuid', studentAssignmentController.getAssignmentDetail);
router.post('/:uuid/submit', studentAssignmentController.uploadMiddleware, studentAssignmentController.submitAssignment);

module.exports = router;
