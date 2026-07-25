const ErrorHandler = require('../../utils/default/errorHandler');
const { Course, CourseModule, Lesson, TestSeries, Category, Pdfs, Subscription, LessonProgress, Educator, Certificate, Assignment, AssignmentSubmission } = require('../../models');
const { Op } = require('sequelize');

// Determines whether the logged-in student can access a course's paid content.
// Reuses the exact TestSeries/Subscription check already used by
// TestSeriesController.js — a course is free if it has no linked TestSeries or
// that TestSeries is free; otherwise it requires a completed, unexpired
// Subscription for that test_series_id.
const resolveCourseAccess = async (course, userId) => {
    if (!course.testSeries) return true;
    if (course.testSeries.pricing_type === 'free') return true;
    if (!userId) return false;

    const subscription = await Subscription.findOne({
        where: {
            user_id: userId,
            test_series_id: course.testSeries.id,
            status: 'completed',
            [Op.or]: [
                { expiry_date: null },
                { expiry_date: { [Op.gt]: new Date() } }
            ]
        }
    });
    return !!subscription;
};

// Whether a student has ever actually engaged with a course — used to decide
// grandfathered access to an unpublished free course, where there's no
// Subscription row to check (free content never creates one).
const hasCourseActivity = async (course, userId) => {
    const certificateCount = await Certificate.count({ where: { course_id: course.id, user_id: userId } });
    if (certificateCount > 0) return true;

    const assignmentIds = (await Assignment.findAll({ where: { course_id: course.id }, attributes: ['id'] })).map((a) => a.id);
    if (assignmentIds.length > 0) {
        const submissionCount = await AssignmentSubmission.count({ where: { assignment_id: assignmentIds, user_id: userId } });
        if (submissionCount > 0) return true;
    }

    const moduleIds = (await CourseModule.findAll({ where: { course_id: course.id }, attributes: ['id'] })).map((m) => m.id);
    if (moduleIds.length > 0) {
        const lessonIds = (await Lesson.findAll({ where: { course_module_id: moduleIds }, attributes: ['id'] })).map((l) => l.id);
        if (lessonIds.length > 0) {
            const progressCount = await LessonProgress.count({ where: { lesson_id: lessonIds, user_id: userId } });
            if (progressCount > 0) return true;
        }
    }

    return false;
};

// Determines whether a student keeps access to a course that has been
// unpublished (status !== 'published'). Paid courses honor an existing valid
// subscription, same as when published; free courses (or courses with no
// linked TestSeries) have no subscription record, so access is grandfathered
// only for students who already engaged with the course before it was
// unpublished.
const resolveGrandfatheredAccess = async (course, userId) => {
    if (!userId) return false;

    if (course.testSeries && course.testSeries.pricing_type !== 'free') {
        const subscription = await Subscription.findOne({
            where: {
                user_id: userId,
                test_series_id: course.testSeries.id,
                status: 'completed',
                [Op.or]: [
                    { expiry_date: null },
                    { expiry_date: { [Op.gt]: new Date() } }
                ]
            }
        });
        return !!subscription;
    }

    return hasCourseActivity(course, userId);
};

exports.getPublishedCourses = async (req, res, next) => {
    try {
        const userId = req.user?.uuid;
        const courses = await Course.findAll({
            where: { status: 'published' },
            include: [
                { model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name', 'pricing_type', 'price'] },
                { model: Educator, as: 'educator', attributes: ['id', 'name', 'avatar', 'designation'] }
            ],
            order: [['created_at', 'DESC']]
        });

        const data = await Promise.all(courses.map(async (course) => {
            const hasAccess = await resolveCourseAccess(course, userId);
            return {
                uuid: course.uuid,
                title: course.title,
                description: course.description,
                thumbnail_url: course.thumbnail_url,
                educator: course.educator,
                isPremium: course.testSeries ? course.testSeries.pricing_type === 'paid' : false,
                price: course.testSeries?.price ?? 0,
                hasAccess
            };
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Get published courses error:', err);
        return next(new ErrorHandler('Failed to fetch courses', 500));
    }
};

exports.getCourseDetail = async (req, res, next) => {
    try {
        const userId = req.user?.uuid;
        const course = await Course.findOne({
            where: { uuid: req.params.uuid },
            include: [
                { model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name', 'pricing_type', 'price'] },
                { model: Educator, as: 'educator', attributes: ['id', 'name', 'avatar', 'designation'] },
                {
                    model: CourseModule,
                    as: 'modules',
                    where: { is_active: true },
                    required: false,
                    separate: true,
                    order: [['display_order', 'ASC']],
                    include: [{
                        model: Lesson,
                        as: 'lessons',
                        where: { is_active: true },
                        required: false,
                        separate: true,
                        order: [['display_order', 'ASC']],
                        include: [
                            { model: Category, as: 'quizCategory', attributes: ['id', 'uuid', 'name'] },
                            { model: Pdfs, as: 'pdf', attributes: ['id', 'title'] }
                        ]
                    }]
                }
            ]
        });
        if (!course) return next(new ErrorHandler('Course not found', 404));

        const hasAccess = course.status === 'published'
            ? await resolveCourseAccess(course, userId)
            : await resolveGrandfatheredAccess(course, userId);

        // Unpublished courses stay invisible to students without grandfathered
        // access — the same 404 a nonexistent course would return, so their
        // existence isn't leaked.
        if (course.status !== 'published' && !hasAccess) {
            return next(new ErrorHandler('Course not found', 404));
        }

        const courseJson = course.toJSON();

        // Lock lesson content details for paid courses the student hasn't
        // purchased — free-preview lessons stay fully visible either way.
        if (!hasAccess) {
            courseJson.modules = courseJson.modules.map((module) => ({
                ...module,
                lessons: module.lessons.map((lesson) => (
                    lesson.is_free_preview
                        ? lesson
                        : { uuid: lesson.uuid, title: lesson.title, lesson_type: lesson.lesson_type, locked: true }
                ))
            }));
        }

        res.status(200).json({ success: true, data: { ...courseJson, hasAccess } });
    } catch (err) {
        console.error('Get course detail error:', err);
        return next(new ErrorHandler('Failed to fetch course', 500));
    }
};

exports.updateLessonProgress = async (req, res, next) => {
    try {
        const userId = req.user?.uuid;
        if (!userId) return next(new ErrorHandler('Authentication required', 401));

        const { uuid } = req.params;
        const { status, watch_seconds } = req.body;

        const lesson = await Lesson.findOne({
            where: { uuid },
            include: [{ model: CourseModule, as: 'module', attributes: ['id', 'course_id'] }]
        });
        if (!lesson) return next(new ErrorHandler('Lesson not found', 404));

        const [progress] = await LessonProgress.findOrCreate({
            where: { user_id: userId, lesson_id: lesson.id },
            defaults: { status: 'in_progress' }
        });

        await progress.update({
            ...(status !== undefined && { status }),
            ...(watch_seconds !== undefined && { watch_seconds }),
            ...(status === 'completed' && { completed_at: new Date() })
        });

        res.status(200).json({ success: true, message: 'Progress updated', data: progress });

        // Non-blocking: response has already been sent, certificate issuance
        // failures here must never surface as a lesson-progress error.
        if (status === 'completed' && lesson.module?.course_id) {
            require('../../controllers/CertificateController/certificateController')
                .autoIssueIfEligible(userId, lesson.module.course_id);
        }
    } catch (err) {
        console.error('Update lesson progress error:', err);
        return next(new ErrorHandler('Failed to update lesson progress', 500));
    }
};
