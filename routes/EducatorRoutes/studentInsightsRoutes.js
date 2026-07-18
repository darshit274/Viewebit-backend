// Viewebit-backend/routes/EducatorRoutes/studentInsightsRoutes.js
const express = require('express');
const router = express.Router();

const studentInsightsController = require('../../controllers/EducatorController/studentInsightsController');
const { educatorAuth } = require('../../utils/EducatorAuth');

router.use(educatorAuth);

router.get('/students', studentInsightsController.listStudents);

module.exports = router;
