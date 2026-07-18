const ErrorHandler = require('../../utils/default/errorHandler');
const { Certificate, CertificateTemplate, Course, CourseModule, Lesson, Category, LessonProgress, TestSession, User } = require('../../models');
const { generateCertificatePdf } = require('../../services/CertificateGenerator');

// Computes what % of a course's active lessons a student has completed.
// Video/document/live lessons complete via LessonProgress; quiz lessons
// complete via an existing completed TestSession whose session_data.category_uuid
// matches the lesson's linked Category — quiz submissions (routes/quizSubmissionRoutes.js)
// mint a fresh throwaway Test row per attempt, so category_uuid in session_data
// is the only stable identifier tying a session back to a specific quiz.
async function computeCourseCompletion(userId, courseId) {
    const modules = await CourseModule.findAll({
        where: { course_id: courseId, is_active: true },
        include: [{
            model: Lesson,
            as: 'lessons',
            where: { is_active: true },
            required: false,
            include: [{ model: Category, as: 'quizCategory', attributes: ['id', 'uuid'] }]
        }]
    });

    const lessons = modules.flatMap((m) => m.lessons);
    if (lessons.length === 0) return { percent: 0, totalLessons: 0, completedLessons: 0 };

    const quizLessons = lessons.filter((l) => l.lesson_type === 'quiz' && l.quizCategory);
    let completedQuizCategoryUuids = new Set();
    if (quizLessons.length > 0) {
        const completedSessions = await TestSession.findAll({
            where: { user_id: userId, status: 'completed' },
            attributes: ['session_data']
        });
        completedQuizCategoryUuids = new Set(
            completedSessions.map((s) => s.session_data?.category_uuid).filter(Boolean)
        );
    }

    let completedCount = 0;
    for (const lesson of lessons) {
        if (lesson.lesson_type === 'quiz') {
            if (lesson.quizCategory && completedQuizCategoryUuids.has(lesson.quizCategory.uuid)) {
                completedCount += 1;
            }
        } else {
            const progress = await LessonProgress.findOne({ where: { user_id: userId, lesson_id: lesson.id, status: 'completed' } });
            if (progress) completedCount += 1;
        }
    }

    return {
        percent: Math.round((completedCount / lessons.length) * 10000) / 100,
        totalLessons: lessons.length,
        completedLessons: completedCount
    };
}

async function generateCertificateNumber() {
    const year = new Date().getFullYear();
    const count = await Certificate.count();
    const sequence = String(count + 1).padStart(6, '0');
    return `VB-${year}-${sequence}`;
}

async function issueCertificateForCourse(userId, course) {
    const existing = await Certificate.findOne({ where: { user_id: userId, course_id: course.id, status: 'issued' } });
    if (existing) return existing;

    const student = await User.findOne({ where: { uuid: userId } });
    if (!student) throw new Error('Student not found');

    // Course only stores branch/department scoping, not institution_id directly,
    // so certificate template selection just picks the org's default template
    // rather than trying to resolve institution scoping through the course.
    const template = await CertificateTemplate.findOne({
        order: [['is_default', 'DESC']]
    }).catch(() => null);

    const certificate = await Certificate.create({
        user_id: userId,
        course_id: course.id,
        template_id: template ? template.id : null,
        certificate_number: await generateCertificateNumber(),
        issued_at: new Date()
    });

    const { pdfUrl } = await generateCertificatePdf({
        certificate,
        template,
        studentName: student.username,
        courseName: course.title
    });

    certificate.pdf_url = pdfUrl;
    await certificate.save();

    return certificate;
}

// Non-blocking side effect: call from updateLessonProgress / test submission.
// Never throws to the caller — a certificate issuance failure must not break
// the lesson-progress or test-submission response it's attached to.
exports.autoIssueIfEligible = async (userId, courseId) => {
    try {
        const course = await Course.findByPk(courseId);
        if (!course || course.status !== 'published') return;

        const alreadyIssued = await Certificate.findOne({ where: { user_id: userId, course_id: courseId, status: 'issued' } });
        if (alreadyIssued) return;

        const { percent } = await computeCourseCompletion(userId, courseId);
        if (percent >= parseFloat(course.completion_threshold_percent)) {
            await issueCertificateForCourse(userId, course);
        }
    } catch (err) {
        console.error('Auto-issue certificate error (non-fatal):', err.message);
    }
};

exports.checkCourseCompletion = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const { courseUuid } = req.params;

        const course = await Course.findOne({ where: { uuid: courseUuid } });
        if (!course) return next(new ErrorHandler('Course not found', 404));

        const result = await computeCourseCompletion(userId, course.id);
        res.status(200).json({ success: true, data: { ...result, threshold: parseFloat(course.completion_threshold_percent) } });
    } catch (err) {
        console.error('Check course completion error:', err);
        return next(new ErrorHandler('Failed to check course completion', 500));
    }
};

// Educator-triggered manual issuance, regardless of completion threshold.
exports.issueCertificate = async (req, res, next) => {
    try {
        const { courseId, userId } = req.params;

        const course = await Course.findOne({ where: { id: courseId, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found or not owned by you', 404));

        const certificate = await issueCertificateForCourse(userId, course);
        res.status(201).json({ success: true, message: 'Certificate issued successfully', data: certificate });
    } catch (err) {
        console.error('Issue certificate error:', err);
        return next(new ErrorHandler('Failed to issue certificate', 500));
    }
};

exports.listMyCertificates = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const certificates = await Certificate.findAll({
            where: { user_id: userId, status: 'issued' },
            include: [{ model: Course, as: 'course', attributes: ['id', 'uuid', 'title', 'thumbnail_url'] }],
            order: [['issued_at', 'DESC']]
        });
        res.status(200).json({ success: true, data: certificates });
    } catch (err) {
        console.error('List my certificates error:', err);
        return next(new ErrorHandler('Failed to fetch certificates', 500));
    }
};

exports.getCertificate = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const certificate = await Certificate.findOne({
            where: { uuid: req.params.uuid, user_id: userId },
            include: [{ model: Course, as: 'course', attributes: ['id', 'uuid', 'title'] }]
        });
        if (!certificate) return next(new ErrorHandler('Certificate not found', 404));
        res.status(200).json({ success: true, data: certificate });
    } catch (err) {
        console.error('Get certificate error:', err);
        return next(new ErrorHandler('Failed to fetch certificate', 500));
    }
};

// Public, unauthenticated — anyone with the verification code (e.g. an
// employer) can confirm a certificate is genuine.
exports.verifyCertificate = async (req, res, next) => {
    try {
        const certificate = await Certificate.findOne({
            where: { verification_code: req.params.code },
            include: [
                { model: Course, as: 'course', attributes: ['title'] },
                { model: User, as: 'student', attributes: ['username'] }
            ]
        });
        if (!certificate || certificate.status !== 'issued') {
            return res.status(404).json({ success: false, message: 'Certificate not found or has been revoked' });
        }

        res.status(200).json({
            success: true,
            data: {
                certificate_number: certificate.certificate_number,
                studentName: certificate.student?.username,
                courseName: certificate.course?.title,
                issued_at: certificate.issued_at,
                status: certificate.status
            }
        });
    } catch (err) {
        console.error('Verify certificate error:', err);
        return next(new ErrorHandler('Failed to verify certificate', 500));
    }
};
