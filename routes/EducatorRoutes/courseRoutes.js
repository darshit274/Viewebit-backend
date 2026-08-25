const express = require('express');
const router = express.Router();

const courseController = require('../../controllers/EducatorController/courseController');
const { educatorAuth } = require('../../utils/EducatorAuth');

router.use(educatorAuth);

// Dropdown helpers for the Course Builder — placed before /:uuid so they don't get swallowed
router.get('/available-test-series', courseController.getAvailableTestSeries);
router.get('/available-quiz-categories', courseController.getAvailableQuizCategories);
router.get('/available-pdfs', courseController.getAvailablePdfs);
router.get('/available-assignments', courseController.getAvailableAssignments);
router.get('/available-live-sessions', courseController.getAvailableLiveSessions);

// Course taxonomy (categories) — also placed before /:uuid
router.get('/categories', courseController.getCourseCategories);
router.post('/categories', courseController.createCourseCategory);

router.get('/', courseController.getMyCourses);
router.post('/', courseController.createCourse);
router.get('/:uuid', courseController.getCourseByUuid);
router.put('/:uuid', courseController.updateCourse);
router.patch('/:uuid/status', courseController.publishCourse);
router.delete('/:uuid', courseController.deleteCourse);
router.post('/:uuid/thumbnail', courseController.uploadThumbnail.single('thumbnail'), courseController.uploadCourseThumbnail);
router.post('/:courseUuid/quiz-categories', courseController.createCourseQuizCategory);

router.post('/:courseUuid/modules', courseController.createModule);
router.patch('/:courseUuid/modules/reorder', courseController.reorderModules);
router.put('/modules/:moduleUuid', courseController.updateModule);
router.delete('/modules/:moduleUuid', courseController.deleteModule);

router.post('/modules/:moduleUuid/lessons', courseController.createLesson);
router.patch('/modules/:moduleUuid/lessons/reorder', courseController.reorderLessons);
router.put('/lessons/:lessonUuid', courseController.updateLesson);
router.delete('/lessons/:lessonUuid', courseController.deleteLesson);

module.exports = router;
