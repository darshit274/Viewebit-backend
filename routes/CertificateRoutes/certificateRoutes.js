const express = require('express');
const router = express.Router();

const certificateController = require('../../controllers/CertificateController/certificateController');
const { authToken } = require('../../utils/AuthToken');

// Public verification — no auth, meant for third parties (e.g. an employer)
router.get('/verify/:code', certificateController.verifyCertificate);

router.get('/', authToken, certificateController.listMyCertificates);
router.get('/:uuid', authToken, certificateController.getCertificate);
router.get('/courses/:courseUuid/completion', authToken, certificateController.checkCourseCompletion);

module.exports = router;
