const express = require('express');
const router = express.Router();

const studentCourseController = require('../../controllers/CourseController/studentCourseController');
const { authToken, optionalAuth } = require('../../utils/AuthToken');

router.get('/', optionalAuth, studentCourseController.getPublishedCourses);
router.get('/:uuid', optionalAuth, studentCourseController.getCourseDetail);
router.patch('/lessons/:uuid/progress', authToken, studentCourseController.updateLessonProgress);

module.exports = router;
