// Viewebit-backend/routes/EducatorRoutes/studentInsightsRoutes.js
const express = require('express');
const router = express.Router();

const studentInsightsController = require('../../controllers/EducatorController/studentInsightsController');
const { educatorAuth } = require('../../utils/EducatorAuth');

router.use(educatorAuth);

router.get('/students', studentInsightsController.listStudents);
router.get('/test-attempts', studentInsightsController.listTestAttempts);
router.get('/test-attempts/:studentUuid', studentInsightsController.getStudentTestAttempts);
router.get('/subscriptions', studentInsightsController.listSubscriptions);
router.get('/subscriptions/stats', studentInsightsController.getSubscriptionStats);
router.post('/subscriptions/manual', studentInsightsController.createManualSubscription);

module.exports = router;
