const ErrorHandler = require('../../utils/default/errorHandler');
const { Course, CourseModule, Lesson, TestSeries, Category, CourseCategory, Pdfs, PdfCategory, Subscription, Certificate, Assignment, AssignmentSubmission, LessonProgress, LiveSession, Institution, sequelize } = require('../../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
// `fs` above is the promises API (used by the existing thumbnail-upload code below);
// the course-PDF handler needs the sync API (existsSync/unlinkSync) for cleanup-on-failure paths.
const fsSync = require('fs');
const { getOrCreateQuizBank, createChildCategory } = require('../../utils/quizCategoryHelpers');
const { validatePDFFile, PDF_UPLOAD_MAX_SIZE_MB } = require('../../utils/pdfUpload');
const { VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES } = require('../../utils/lessonMediaUpload');

// Configure multer for course featured-image uploads
const thumbnailStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/course-thumbnails');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `course-${req.educator.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

exports.uploadThumbnail = multer({
    storage: thumbnailStorage,
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Only JPG, PNG, GIF, and WebP files are allowed'));
    }
});

const COURSE_CATEGORY_INCLUDE = { model: CourseCategory, as: 'categories', attributes: ['id', 'uuid', 'name'], through: { attributes: [] } };

function toFullUploadUrl(req, relativePath) {
    if (relativePath && relativePath.startsWith('/uploads/')) {
        return `${req.protocol}://${req.get('host')}${relativePath}`;
    }
    return relativePath || null;
}

function withFullThumbnailUrl(req, courseJson) {
    return { ...courseJson, thumbnail_url: toFullUploadUrl(req, courseJson.thumbnail_url) };
}

// Returns { ok: true, ids } or { ok: false } if any requested id isn't owned
// by this educator — callers turn a false result into a 400 themselves so
// the specific error message survives their existing try/catch.
async function resolveOwnedCategoryIds(educatorId, categoryIds) {
    if (!categoryIds || !categoryIds.length) return { ok: true, ids: [] };
    const owned = await CourseCategory.findAll({ where: { id: categoryIds, educator_id: educatorId }, attributes: ['id'] });
    if (owned.length !== categoryIds.length) return { ok: false };
    return { ok: true, ids: owned.map((c) => c.id) };
}

// Lazily creates (once per course, cached on courses.quiz_category_id) a
// "container" quiz category scoped to this course, living under the
// educator's own quiz bank, that inline-created quiz categories nest under.
async function findOrCreateCourseQuizRoot(course, educator) {
    if (course.quiz_category_id) {
        const existing = await Category.findByPk(course.quiz_category_id);
        if (existing) return existing;
    }

    const quizBank = await getOrCreateQuizBank(educator);
    const root = await createChildCategory({
        parentCategory: null,
        testSeriesId: quizBank.id,
        hierarchyLevel: 0,
        educatorId: educator.id,
        name: `${course.title} — Course Quizzes`,
        description: `Auto-created container for quizzes created inline from the "${course.title}" course builder.`,
        nodeType: 'container'
    });

    await course.update({ quiz_category_id: root.id });
    return root;
}

// Lazily creates (once per course, cached on courses.pdf_category_id) a
// "folder" PDF category scoped to this course, that inline PDF uploads land
// in — mirroring the existing PDF Library folder/upload mechanics, just
// without exposing the folder-picker step.
async function findOrCreateCoursePdfRoot(course, educator) {
    if (course.pdf_category_id) {
        const existing = await PdfCategory.findByPk(course.pdf_category_id);
        if (existing) return existing;
    }

    const category = await PdfCategory.create({
        name: `${course.title} — Course PDFs`,
        description: `Auto-created folder for PDFs uploaded inline from the "${course.title}" course builder.`,
        node_type: 'unset',
        educator_id: educator.id
    });

    await course.update({ pdf_category_id: category.id });
    return category;
}

// My Courses ---------------------------------------------------------------

exports.getMyCourses = async (req, res, next) => {
    try {
        const courses = await Course.findAll({
            where: { educator_id: req.educator.id },
            include: [
                { model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name', 'price', 'pricing_type', 'educator_id'] },
                COURSE_CATEGORY_INCLUDE
            ],
            order: [['created_at', 'DESC']]
        });

        // Student count is derived from existing Subscription records against
        // the linked TestSeries — no separate enrollment table needed.
        const withCounts = await Promise.all(courses.map(async (course) => {
            const courseJson = course.toJSON();
            let studentCount = 0;
            if (course.test_series_id) {
                studentCount = await Subscription.count({
                    where: { test_series_id: course.test_series_id, status: 'completed' }
                });
            }
            return withFullThumbnailUrl(req, { ...courseJson, studentCount });
        }));

        res.status(200).json({ success: true, data: withCounts });
    } catch (err) {
        console.error('Get my courses error:', err);
        return next(new ErrorHandler('Failed to fetch courses', 500));
    }
};

exports.getCourseByUuid = async (req, res, next) => {
    try {
        const course = await Course.findOne({
            where: { uuid: req.params.uuid, educator_id: req.educator.id },
            include: [
                { model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name', 'price', 'pricing_type', 'educator_id'] },
                COURSE_CATEGORY_INCLUDE,
                {
                    model: CourseModule,
                    as: 'modules',
                    include: [{
                        model: Lesson,
                        as: 'lessons',
                        include: [
                            { model: Pdfs, as: 'pdf', attributes: ['id', 'title'] },
                            { model: Category, as: 'quizCategory', attributes: ['id', 'uuid', 'name'] },
                            { model: LiveSession, as: 'liveSession', attributes: ['id', 'uuid', 'title', 'meeting_provider', 'meeting_url', 'scheduled_start', 'status'] },
                            { model: Assignment, as: 'assignment', attributes: ['id', 'uuid', 'title', 'submission_type'] }
                        ],
                        separate: true,
                        order: [['display_order', 'ASC']]
                    }],
                    separate: true,
                    order: [['display_order', 'ASC']]
                }
            ]
        });
        if (!course) return next(new ErrorHandler('Course not found', 404));
        res.status(200).json({ success: true, data: withFullThumbnailUrl(req, course.toJSON()) });
    } catch (err) {
        console.error('Get course by uuid error:', err);
        return next(new ErrorHandler('Failed to fetch course', 500));
    }
};

exports.createCourse = async (req, res, next) => {
    let transaction;
    try {
        const { title, description, test_series_id, thumbnail_url, price, category_ids } = req.body;
        if (!title) return next(new ErrorHandler('Title is required', 400));

        const resolvedCategories = await resolveOwnedCategoryIds(req.educator.id, category_ids);
        if (!resolvedCategories.ok) return next(new ErrorHandler('One or more categories were not found', 400));

        const institution = req.educator.institution_id
            ? await Institution.findByPk(req.educator.institution_id, { attributes: ['id', 'pricing_mode'] })
            : null;
        const pricingMode = institution?.pricing_mode || 'coaching_center';

        // A blank or null price means "the client did not supply one" — only a
        // real value counts as an attempt to set pricing.
        const priceSupplied = price !== undefined && price !== null && price !== '';

        if (priceSupplied && pricingMode !== 'private_educator') {
            return next(new ErrorHandler('Only private-educator institutions can set course pricing directly', 400));
        }

        let finalTestSeriesId = test_series_id || null;
        let numericPrice = null;

        if (priceSupplied) {
            // A price always creates and links a fresh, educator-owned series —
            // any test_series_id also present in the request is ignored, so the
            // two inputs never conflict.
            numericPrice = Number(price);
            if (isNaN(numericPrice) || numericPrice < 0) {
                return next(new ErrorHandler('A valid, non-negative price is required', 400));
            }
        } else if (test_series_id) {
            const testSeries = await TestSeries.findByPk(test_series_id);
            if (!testSeries) return next(new ErrorHandler('Test series not found', 404));

            // Linking an existing series is the other way a course can end up
            // priced, so it has to honour exactly the same pricing_mode rules
            // as the price path above.
            if (testSeries.institution_id !== (req.educator.institution_id || null)) {
                return next(new ErrorHandler('This test series belongs to another institution', 400));
            }
            if (pricingMode === 'school' && testSeries.pricing_type !== 'free') {
                return next(new ErrorHandler('School-mode institutions can only link a free test series', 400));
            }
            if (pricingMode === 'private_educator' && testSeries.educator_id !== req.educator.id) {
                return next(new ErrorHandler('You can only link a test series you created yourself', 400));
            }

            const existing = await Course.findOne({ where: { test_series_id } });
            if (existing) return next(new ErrorHandler('This test series is already linked to another course', 400));
        }

        transaction = await sequelize.transaction();

        if (priceSupplied) {
            const newSeries = await TestSeries.create({
                name: title,
                pricing_type: numericPrice > 0 ? 'paid' : 'free',
                price: numericPrice,
                currency: 'INR',
                institution_id: req.educator.institution_id || null,
                educator_id: req.educator.id
            }, { transaction });
            finalTestSeriesId = newSeries.id;
        }

        const course = await Course.create({
            title,
            description,
            thumbnail_url,
            test_series_id: finalTestSeriesId,
            educator_id: req.educator.id,
            branch_id: req.educator.branch_id,
            department_id: req.educator.department_id
        }, { transaction });

        if (resolvedCategories.ids.length) {
            await course.setCategories(resolvedCategories.ids, { transaction });
        }

        await transaction.commit();

        const created = await Course.findByPk(course.id, { include: [COURSE_CATEGORY_INCLUDE] });
        res.status(201).json({ success: true, message: 'Course created successfully', data: withFullThumbnailUrl(req, created.toJSON()) });
    } catch (err) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Create course error:', err);
        return next(new ErrorHandler('Failed to create course', 500));
    }
};

exports.updateCourse = async (req, res, next) => {
    let transaction;
    try {
        const course = await Course.findOne({ where: { uuid: req.params.uuid, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found', 404));

        const { title, description, thumbnail_url, completion_threshold_percent, price, category_ids } = req.body;

        const resolvedCategories = category_ids !== undefined
            ? await resolveOwnedCategoryIds(req.educator.id, category_ids)
            : null;
        if (resolvedCategories && !resolvedCategories.ok) {
            return next(new ErrorHandler('One or more categories were not found', 400));
        }

        // A blank or null price means "the client did not supply one" — only a
        // real value counts as an attempt to set pricing.
        const priceSupplied = price !== undefined && price !== null && price !== '';

        if (priceSupplied) {
            const institution = req.educator.institution_id
                ? await Institution.findByPk(req.educator.institution_id, { attributes: ['id', 'pricing_mode'] })
                : null;
            const pricingMode = institution?.pricing_mode || 'coaching_center';

            if (pricingMode !== 'private_educator') {
                return next(new ErrorHandler('Only private-educator institutions can set course pricing directly', 400));
            }

            const numericPrice = Number(price);
            if (isNaN(numericPrice) || numericPrice < 0) {
                return next(new ErrorHandler('A valid, non-negative price is required', 400));
            }
            const pricingType = numericPrice > 0 ? 'paid' : 'free';

            if (course.test_series_id) {
                const existingSeries = await TestSeries.findByPk(course.test_series_id);
                if (!existingSeries || existingSeries.educator_id !== req.educator.id) {
                    return next(new ErrorHandler('You can only price a test series you created yourself for this course', 400));
                }
                await existingSeries.update({ price: numericPrice, pricing_type: pricingType });
            } else {
                // Create-then-link has to be atomic so a failure can't leave an
                // orphaned series, and two concurrent updates can't each create
                // one for the same course.
                transaction = await sequelize.transaction();
                const newSeries = await TestSeries.create({
                    name: title || course.title,
                    pricing_type: pricingType,
                    price: numericPrice,
                    currency: 'INR',
                    institution_id: req.educator.institution_id || null,
                    educator_id: req.educator.id
                }, { transaction });
                await course.update({ test_series_id: newSeries.id }, { transaction });
                await transaction.commit();
            }
        }

        await course.update({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(thumbnail_url !== undefined && { thumbnail_url }),
            ...(completion_threshold_percent !== undefined && { completion_threshold_percent })
        });

        if (resolvedCategories) {
            await course.setCategories(resolvedCategories.ids);
        }

        const updated = await Course.findByPk(course.id, { include: [COURSE_CATEGORY_INCLUDE] });
        res.status(200).json({ success: true, message: 'Course updated successfully', data: withFullThumbnailUrl(req, updated.toJSON()) });
    } catch (err) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Update course error:', err);
        return next(new ErrorHandler('Failed to update course', 500));
    }
};

exports.publishCourse = async (req, res, next) => {
    try {
        const course = await Course.findOne({ where: { uuid: req.params.uuid, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found', 404));

        const nextStatus = req.body.status;
        if (!['draft', 'published', 'archived'].includes(nextStatus)) {
            return next(new ErrorHandler('Invalid status', 400));
        }

        course.status = nextStatus;
        await course.save();

        res.status(200).json({ success: true, message: `Course ${nextStatus}`, data: course });
    } catch (err) {
        console.error('Publish course error:', err);
        return next(new ErrorHandler('Failed to update course status', 500));
    }
};

exports.deleteCourse = async (req, res, next) => {
    try {
        const course = await Course.findOne({ where: { uuid: req.params.uuid, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found', 404));

        if (course.test_series_id) {
            const activeSubscriptions = await Subscription.count({
                where: { test_series_id: course.test_series_id, status: 'completed' }
            });
            if (activeSubscriptions > 0) {
                return next(new ErrorHandler('Cannot delete a course with active student subscriptions', 400));
            }
        }

        // Beyond active subscriptions: block deletion if any student has ever
        // earned a certificate, submitted an assignment, or made lesson
        // progress in this course — covers refunded subscriptions and
        // courses with no linked test series (neither of which the
        // subscription check above sees).
        const certificateCount = await Certificate.count({ where: { course_id: course.id } });
        if (certificateCount > 0) {
            return next(new ErrorHandler('Cannot delete a course with issued student certificates', 400));
        }

        const assignmentIds = (await Assignment.findAll({ where: { course_id: course.id }, attributes: ['id'] })).map((a) => a.id);
        if (assignmentIds.length > 0) {
            const submissionCount = await AssignmentSubmission.count({ where: { assignment_id: assignmentIds } });
            if (submissionCount > 0) {
                return next(new ErrorHandler('Cannot delete a course with student assignment submissions', 400));
            }
        }

        const moduleIds = (await CourseModule.findAll({ where: { course_id: course.id }, attributes: ['id'] })).map((m) => m.id);
        if (moduleIds.length > 0) {
            const lessonIds = (await Lesson.findAll({ where: { course_module_id: moduleIds }, attributes: ['id'] })).map((l) => l.id);
            if (lessonIds.length > 0) {
                const progressCount = await LessonProgress.count({ where: { lesson_id: lessonIds } });
                if (progressCount > 0) {
                    return next(new ErrorHandler('Cannot delete a course with student lesson progress', 400));
                }
            }
        }

        await course.destroy();
        res.status(200).json({ success: true, message: 'Course deleted successfully' });
    } catch (err) {
        console.error('Delete course error:', err);
        return next(new ErrorHandler('Failed to delete course', 500));
    }
};

// Modules --------------------------------------------------------------------

const findOwnedCourse = async (courseUuid, educatorId) => {
    return Course.findOne({ where: { uuid: courseUuid, educator_id: educatorId } });
};

exports.createModule = async (req, res, next) => {
    try {
        const { courseUuid } = req.params;
        const { title } = req.body;
        if (!title) return next(new ErrorHandler('Title is required', 400));

        const course = await findOwnedCourse(courseUuid, req.educator.id);
        if (!course) return next(new ErrorHandler('Course not found or not owned by you', 404));

        const display_order = await CourseModule.count({ where: { course_id: course.id } });
        const module = await CourseModule.create({ course_id: course.id, title, display_order });

        res.status(201).json({ success: true, message: 'Module created successfully', data: module });
    } catch (err) {
        console.error('Create module error:', err);
        return next(new ErrorHandler('Failed to create module', 500));
    }
};

exports.updateModule = async (req, res, next) => {
    try {
        const module = await CourseModule.findOne({
            where: { uuid: req.params.moduleUuid },
            include: [{ model: Course, as: 'course', where: { educator_id: req.educator.id } }]
        });
        if (!module) return next(new ErrorHandler('Module not found or not owned by you', 404));

        const { title, is_active } = req.body;
        await module.update({
            ...(title !== undefined && { title }),
            ...(is_active !== undefined && { is_active })
        });

        res.status(200).json({ success: true, message: 'Module updated successfully', data: module });
    } catch (err) {
        console.error('Update module error:', err);
        return next(new ErrorHandler('Failed to update module', 500));
    }
};

exports.reorderModules = async (req, res, next) => {
    try {
        const { courseUuid } = req.params;
        const { orderedModuleUuids } = req.body;
        if (!Array.isArray(orderedModuleUuids)) {
            return next(new ErrorHandler('orderedModuleUuids must be an array', 400));
        }

        const course = await findOwnedCourse(courseUuid, req.educator.id);
        if (!course) return next(new ErrorHandler('Course not found or not owned by you', 404));

        await Promise.all(orderedModuleUuids.map((uuid, index) =>
            CourseModule.update({ display_order: index }, { where: { uuid, course_id: course.id } })
        ));

        res.status(200).json({ success: true, message: 'Modules reordered successfully' });
    } catch (err) {
        console.error('Reorder modules error:', err);
        return next(new ErrorHandler('Failed to reorder modules', 500));
    }
};

exports.deleteModule = async (req, res, next) => {
    try {
        const module = await CourseModule.findOne({
            where: { uuid: req.params.moduleUuid },
            include: [{ model: Course, as: 'course', where: { educator_id: req.educator.id } }]
        });
        if (!module) return next(new ErrorHandler('Module not found or not owned by you', 404));

        await module.destroy();
        res.status(200).json({ success: true, message: 'Module deleted successfully' });
    } catch (err) {
        console.error('Delete module error:', err);
        return next(new ErrorHandler('Failed to delete module', 500));
    }
};

// Lessons --------------------------------------------------------------------

const findOwnedModule = async (moduleUuid, educatorId) => {
    return CourseModule.findOne({
        where: { uuid: moduleUuid },
        include: [{ model: Course, as: 'course', where: { educator_id: educatorId } }]
    });
};

// Shared existence/ownership checks for the lessons's linkable entities —
// called from both createLesson and updateLesson so a lesson can never end
// up pointing at another educator's (or another course's) content.
async function validateLessonLinks(req, courseId, { pdf_id, category_id, live_session_id, assignment_id }) {
    if (pdf_id) {
        const pdf = await Pdfs.findByPk(pdf_id);
        if (!pdf) return 'PDF not found';
    }
    if (category_id) {
        // Quiz lessons must point at a question_holder Category this educator
        // authored themselves (see EducatorController/quizHierarchyController.js)
        // — this is the same Category model the real quiz-taking screens use.
        const category = await Category.findOne({ where: { id: category_id, educator_id: req.educator.id } });
        if (!category) return 'Quiz category not found or not owned by you';
    }
    if (live_session_id) {
        const liveSession = await LiveSession.findOne({ where: { id: live_session_id, educator_id: req.educator.id, course_id: courseId } });
        if (!liveSession) return 'Live session not found, not owned by you, or belongs to a different course';
    }
    if (assignment_id) {
        const assignment = await Assignment.findOne({ where: { id: assignment_id, educator_id: req.educator.id, course_id: courseId } });
        if (!assignment) return 'Assignment not found, not owned by you, or belongs to a different course';
    }
    return null;
}

exports.createLesson = async (req, res, next) => {
    try {
        const { moduleUuid } = req.params;
        const { title, lesson_type, video_url, content_html, pdf_id, category_id, live_session_id, assignment_id, duration_minutes, is_free_preview } = req.body;

        if (!title || !lesson_type) return next(new ErrorHandler('Title and lesson_type are required', 400));
        if (!['video', 'document', 'text', 'pdf', 'audio', 'quiz', 'live', 'assignment'].includes(lesson_type)) {
            return next(new ErrorHandler('Invalid lesson_type', 400));
        }

        const module = await findOwnedModule(moduleUuid, req.educator.id);
        if (!module) return next(new ErrorHandler('Module not found or not owned by you', 404));

        const linkError = await validateLessonLinks(req, module.course.id, { pdf_id, category_id, live_session_id, assignment_id });
        if (linkError) return next(new ErrorHandler(linkError, 404));

        const display_order = await Lesson.count({ where: { course_module_id: module.id } });
        const lesson = await Lesson.create({
            course_module_id: module.id,
            title,
            lesson_type,
            video_url: video_url || null,
            content_html: content_html || null,
            pdf_id: pdf_id || null,
            category_id: category_id || null,
            live_session_id: live_session_id || null,
            assignment_id: assignment_id || null,
            duration_minutes: duration_minutes || null,
            is_free_preview: is_free_preview ?? false,
            display_order
        });

        res.status(201).json({ success: true, message: 'Lesson created successfully', data: lesson });
    } catch (err) {
        console.error('Create lesson error:', err);
        return next(new ErrorHandler('Failed to create lesson', 500));
    }
};

exports.updateLesson = async (req, res, next) => {
    try {
        const lesson = await Lesson.findOne({
            where: { uuid: req.params.lessonUuid },
            include: [{
                model: CourseModule,
                as: 'module',
                include: [{ model: Course, as: 'course', where: { educator_id: req.educator.id } }]
            }]
        });
        if (!lesson) return next(new ErrorHandler('Lesson not found or not owned by you', 404));

        const { title, video_url, content_html, pdf_id, category_id, live_session_id, assignment_id, duration_minutes, is_free_preview, is_active } = req.body;

        const linkError = await validateLessonLinks(req, lesson.module.course.id, { pdf_id, category_id, live_session_id, assignment_id });
        if (linkError) return next(new ErrorHandler(linkError, 404));

        await lesson.update({
            ...(title !== undefined && { title }),
            ...(video_url !== undefined && { video_url }),
            ...(content_html !== undefined && { content_html }),
            ...(pdf_id !== undefined && { pdf_id }),
            ...(category_id !== undefined && { category_id }),
            ...(live_session_id !== undefined && { live_session_id }),
            ...(assignment_id !== undefined && { assignment_id }),
            ...(duration_minutes !== undefined && { duration_minutes }),
            ...(is_free_preview !== undefined && { is_free_preview }),
            ...(is_active !== undefined && { is_active })
        });

        res.status(200).json({ success: true, message: 'Lesson updated successfully', data: lesson });
    } catch (err) {
        console.error('Update lesson error:', err);
        return next(new ErrorHandler('Failed to update lesson', 500));
    }
};

exports.reorderLessons = async (req, res, next) => {
    try {
        const { moduleUuid } = req.params;
        const { orderedLessonUuids } = req.body;
        if (!Array.isArray(orderedLessonUuids)) {
            return next(new ErrorHandler('orderedLessonUuids must be an array', 400));
        }

        const module = await findOwnedModule(moduleUuid, req.educator.id);
        if (!module) return next(new ErrorHandler('Module not found or not owned by you', 404));

        await Promise.all(orderedLessonUuids.map((uuid, index) =>
            Lesson.update({ display_order: index }, { where: { uuid, course_module_id: module.id } })
        ));

        res.status(200).json({ success: true, message: 'Lessons reordered successfully' });
    } catch (err) {
        console.error('Reorder lessons error:', err);
        return next(new ErrorHandler('Failed to reorder lessons', 500));
    }
};

exports.deleteLesson = async (req, res, next) => {
    try {
        const lesson = await Lesson.findOne({
            where: { uuid: req.params.lessonUuid },
            include: [{
                model: CourseModule,
                as: 'module',
                include: [{ model: Course, as: 'course', where: { educator_id: req.educator.id } }]
            }]
        });
        if (!lesson) return next(new ErrorHandler('Lesson not found or not owned by you', 404));

        await lesson.destroy();
        res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
    } catch (err) {
        console.error('Delete lesson error:', err);
        return next(new ErrorHandler('Failed to delete lesson', 500));
    }
};

// Dropdown helpers for the Course Builder ------------------------------------

exports.getAvailableTestSeries = async (req, res, next) => {
    try {
        const alreadyLinked = await Course.findAll({ attributes: ['test_series_id'], where: { test_series_id: { [Op.ne]: null } } });
        const linkedIds = alreadyLinked.map((c) => c.test_series_id);

        const testSeries = await TestSeries.findAll({
            where: {
                is_active: true,
                id: { [Op.notIn]: linkedIds.length ? linkedIds : [0] },
                institution_id: req.educator.institution_id || null
            },
            attributes: ['id', 'uuid', 'name'],
            order: [['name', 'ASC']]
        });
        res.status(200).json({ success: true, data: testSeries });
    } catch (err) {
        console.error('Get available test series error:', err);
        return next(new ErrorHandler('Failed to fetch test series', 500));
    }
};

// Lists this educator's own quiz categories (Category rows they authored via
// the quiz hierarchy builder) that are ready to hold a quiz — i.e. already a
// question_holder with at least one question, or still unset (can become one).
exports.getAvailableQuizCategories = async (req, res, next) => {
    try {
        const categories = await Category.findAll({
            where: {
                educator_id: req.educator.id,
                node_type: { [Op.in]: ['question_holder', 'unset'] },
                is_active: true
            },
            attributes: ['id', 'uuid', 'name', 'node_type'],
            order: [['name', 'ASC']],
            limit: 200
        });
        res.status(200).json({ success: true, data: categories });
    } catch (err) {
        console.error('Get available quiz categories error:', err);
        return next(new ErrorHandler('Failed to fetch quiz categories', 500));
    }
};

exports.getAvailablePdfs = async (req, res, next) => {
    try {
        const pdfs = await Pdfs.findAll({
            where: { is_active: true, uploaded_by_educator_id: req.educator.id },
            attributes: ['id', 'title'],
            order: [['title', 'ASC']],
            limit: 200
        });
        res.status(200).json({ success: true, data: pdfs });
    } catch (err) {
        console.error('Get available pdfs error:', err);
        return next(new ErrorHandler('Failed to fetch PDFs', 500));
    }
};

// Unlike getAvailableQuizCategories/getAvailablePdfs above (educator-wide),
// assignments and live sessions belong to one specific Course — linking one
// from a different course into this lesson would be a data-integrity bug,
// so both endpoints below require and filter by course_id.
exports.getAvailableAssignments = async (req, res, next) => {
    try {
        const courseId = parseInt(req.query.course_id, 10);
        if (!courseId) return next(new ErrorHandler('course_id is required', 400));

        const assignments = await Assignment.findAll({
            where: { educator_id: req.educator.id, course_id: courseId },
            attributes: ['id', 'uuid', 'title', 'submission_type'],
            order: [['title', 'ASC']],
            limit: 200
        });
        res.status(200).json({ success: true, data: assignments });
    } catch (err) {
        console.error('Get available assignments error:', err);
        return next(new ErrorHandler('Failed to fetch assignments', 500));
    }
};

// Inline quiz creation from the course builder — creates (or reuses) a
// course-scoped root category, then a named quiz category as its child.
exports.createCourseQuizCategory = async (req, res, next) => {
    try {
        const { courseUuid } = req.params;
        const { name } = req.body;
        if (!name || !name.trim()) return next(new ErrorHandler('Quiz name is required', 400));

        const course = await Course.findOne({ where: { uuid: courseUuid, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found or not owned by you', 404));

        const root = await findOrCreateCourseQuizRoot(course, req.educator);
        const category = await createChildCategory({
            parentCategory: root,
            testSeriesId: root.test_series_id,
            hierarchyLevel: root.hierarchy_level + 1,
            educatorId: req.educator.id,
            name,
            description: null
        });

        res.status(201).json({
            success: true,
            data: { id: category.id, uuid: category.uuid, name: category.name, node_type: category.node_type }
        });
    } catch (err) {
        console.error('Create course quiz category error:', err);
        return next(new ErrorHandler('Failed to create quiz', 500));
    }
};

// Inline PDF upload from the course builder — creates (or reuses) a
// course-scoped root PDF folder, then uploads directly into it, mirroring
// the existing PDF Library folder/upload mechanics.
exports.uploadCoursePdf = async (req, res, next) => {
    try {
        const { courseUuid } = req.params;
        const { title, description } = req.body;

        if (!req.file) return next(new ErrorHandler('No PDF file provided', 400));
        if (req.file.mimetype !== 'application/pdf') {
            if (fsSync.existsSync(req.file.path)) fsSync.unlinkSync(req.file.path);
            return next(new ErrorHandler('Only PDF files are allowed', 400));
        }
        if (!validatePDFFile(req.file.path)) {
            if (fsSync.existsSync(req.file.path)) fsSync.unlinkSync(req.file.path);
            return next(new ErrorHandler('Invalid PDF — file signature check failed', 400));
        }
        if (!title || !title.trim()) {
            if (fsSync.existsSync(req.file.path)) fsSync.unlinkSync(req.file.path);
            return next(new ErrorHandler('Title is required', 400));
        }

        const course = await Course.findOne({ where: { uuid: courseUuid, educator_id: req.educator.id } });
        if (!course) {
            if (fsSync.existsSync(req.file.path)) fsSync.unlinkSync(req.file.path);
            return next(new ErrorHandler('Course not found or not owned by you', 404));
        }

        const category = await findOrCreateCoursePdfRoot(course, req.educator);

        const pdf = await Pdfs.create({
            title: title.trim(),
            description: description?.trim() || null,
            category_id: category.id,
            file_path: req.file.path,
            original_filename: req.file.originalname,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            uploaded_by_educator_id: req.educator.id
        });

        if (category.node_type === 'unset') {
            await category.update({ node_type: 'pdf_holder' });
        }

        res.status(201).json({ success: true, data: { id: pdf.id, title: pdf.title } });
    } catch (err) {
        console.error('Upload course PDF error:', err);
        return next(new ErrorHandler('Failed to upload PDF', 500));
    }
};

// Inline video/audio upload from the course builder — the resulting URL is
// written directly into Lesson.video_url by the frontend (no schema change).
exports.uploadLessonMedia = async (req, res, next) => {
    try {
        const { courseUuid } = req.params;
        const { kind } = req.body;

        if (!req.file) return next(new ErrorHandler('No file provided', 400));
        if (!['video', 'audio'].includes(kind)) {
            if (fsSync.existsSync(req.file.path)) fsSync.unlinkSync(req.file.path);
            return next(new ErrorHandler('kind must be "video" or "audio"', 400));
        }
        const cap = kind === 'video' ? VIDEO_UPLOAD_MAX_SIZE_BYTES : AUDIO_UPLOAD_MAX_SIZE_BYTES;
        if (req.file.size > cap) {
            if (fsSync.existsSync(req.file.path)) fsSync.unlinkSync(req.file.path);
            return next(new ErrorHandler(`File exceeds the ${kind} upload limit`, 400));
        }
        if (!req.file.mimetype.startsWith(`${kind}/`)) {
            if (fsSync.existsSync(req.file.path)) fsSync.unlinkSync(req.file.path);
            return next(new ErrorHandler(`File does not match kind=${kind}`, 400));
        }

        const course = await Course.findOne({ where: { uuid: courseUuid, educator_id: req.educator.id } });
        if (!course) {
            if (fsSync.existsSync(req.file.path)) fsSync.unlinkSync(req.file.path);
            return next(new ErrorHandler('Course not found or not owned by you', 404));
        }

        const relativePath = `/uploads/lesson_media/${req.file.filename}`;
        const url = toFullUploadUrl(req, relativePath);
        res.status(201).json({ success: true, data: { url } });
    } catch (err) {
        console.error('Upload lesson media error:', err);
        return next(new ErrorHandler('Failed to upload media', 500));
    }
};

exports.getAvailableLiveSessions = async (req, res, next) => {
    try {
        const courseId = parseInt(req.query.course_id, 10);
        if (!courseId) return next(new ErrorHandler('course_id is required', 400));

        const where = { educator_id: req.educator.id, course_id: courseId };
        if (req.query.provider) where.meeting_provider = req.query.provider;

        const liveSessions = await LiveSession.findAll({
            where,
            attributes: ['id', 'uuid', 'title', 'meeting_provider', 'meeting_url', 'scheduled_start', 'status'],
            order: [['scheduled_start', 'DESC']],
            limit: 200
        });
        res.status(200).json({ success: true, data: liveSessions });
    } catch (err) {
        console.error('Get available live sessions error:', err);
        return next(new ErrorHandler('Failed to fetch live sessions', 500));
    }
};

// Course Categories (course taxonomy, distinct from the quiz-hierarchy Category
// model above) ---------------------------------------------------------------

exports.getCourseCategories = async (req, res, next) => {
    try {
        const categories = await CourseCategory.findAll({
            where: { educator_id: req.educator.id },
            attributes: ['id', 'uuid', 'name'],
            order: [['name', 'ASC']]
        });
        res.status(200).json({ success: true, data: categories });
    } catch (err) {
        console.error('Get course categories error:', err);
        return next(new ErrorHandler('Failed to fetch course categories', 500));
    }
};

exports.createCourseCategory = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return next(new ErrorHandler('Category name is required', 400));

        const existing = await CourseCategory.findOne({ where: { educator_id: req.educator.id, name: name.trim() } });
        if (existing) return next(new ErrorHandler('You already have a category with this name', 400));

        const category = await CourseCategory.create({ educator_id: req.educator.id, name: name.trim() });
        res.status(201).json({ success: true, message: 'Category created', data: category });
    } catch (err) {
        console.error('Create course category error:', err);
        return next(new ErrorHandler('Failed to create category', 500));
    }
};

// Course Thumbnail Upload -----------------------------------------------------

exports.uploadCourseThumbnail = async (req, res, next) => {
    try {
        if (!req.file) return next(new ErrorHandler('No image file uploaded', 400));

        const course = await Course.findOne({ where: { uuid: req.params.uuid, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found', 404));

        if (course.thumbnail_url && course.thumbnail_url.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, '../..', course.thumbnail_url);
            try {
                await fs.unlink(oldPath);
            } catch (error) {
                console.log('Error deleting old course thumbnail:', error.message);
            }
        }

        const relativePath = `/uploads/course-thumbnails/${req.file.filename}`;
        await course.update({ thumbnail_url: relativePath });

        res.status(200).json({ success: true, message: 'Thumbnail uploaded', data: { thumbnail_url: toFullUploadUrl(req, relativePath) } });
    } catch (err) {
        console.error('Upload course thumbnail error:', err);
        return next(new ErrorHandler('Failed to upload thumbnail', 500));
    }
};
