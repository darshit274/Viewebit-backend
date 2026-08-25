const express = require('express');
const router = express.Router();

const assignmentController = require('../../controllers/EducatorController/assignmentController');
const { educatorAuth } = require('../../utils/EducatorAuth');

router.use(educatorAuth);

router.get('/assignments', assignmentController.listAllMyAssignments);
router.get('/courses/:courseUuid/assignments', assignmentController.listAssignments);
router.post('/courses/:courseUuid/assignments', assignmentController.createAssignment);
router.put('/assignments/:uuid', assignmentController.updateAssignment);
router.delete('/assignments/:uuid', assignmentController.deleteAssignment);
router.get('/assignments/:uuid/submissions', assignmentController.listSubmissions);
router.patch('/submissions/:submissionUuid/grade', assignmentController.gradeSubmission);

module.exports = router;
