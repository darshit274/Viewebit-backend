const express = require('express');
const router = express.Router();

const certificateController = require('../../controllers/CertificateController/certificateController');
const { educatorAuth } = require('../../utils/EducatorAuth');

router.post('/:courseId/students/:userId/issue', educatorAuth, certificateController.issueCertificate);

module.exports = router;
