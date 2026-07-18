const express = require('express');
const router = express.Router();

const quizHierarchyController = require('../../controllers/EducatorController/quizHierarchyController');
const { educatorAuth } = require('../../utils/EducatorAuth');

router.use(educatorAuth);

router.get('/roots', quizHierarchyController.getRootCategories);
router.get('/categories/:categoryUuid', quizHierarchyController.getCategoryContent);
router.post('/categories', quizHierarchyController.createCategory);
router.post('/categories/:parentUuid/subcategories', quizHierarchyController.createCategory);
router.put('/categories/:categoryUuid', quizHierarchyController.updateCategory);
router.delete('/categories/:categoryUuid', quizHierarchyController.deleteCategory);

router.post('/categories/:categoryUuid/questions', quizHierarchyController.createQuestion);
router.put('/questions/:questionUuid', quizHierarchyController.updateQuestion);
router.delete('/questions/:questionUuid', quizHierarchyController.deleteQuestion);

module.exports = router;
