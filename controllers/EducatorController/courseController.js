const ErrorHandler = require('../../utils/default/errorHandler');
const { Course, CourseModule, Lesson, TestSeries, Category, Pdfs, Subscription } = require('../../models');
const { Op } = require('sequelize');

// My Courses ---------------------------------------------------------------

exports.getMyCourses = async (req, res, next) => {
    try {
        const courses = await Course.findAll({
            where: { educator_id: req.educator.id },
            include: [{ model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name'] }],
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
            return { ...courseJson, studentCount };
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
                { model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name'] },
                {
                    model: CourseModule,
                    as: 'modules',
                    include: [{ model: Lesson, as: 'lessons', separate: true, order: [['display_order', 'ASC']] }],
                    separate: true,
                    order: [['display_order', 'ASC']]
                }
            ]
        });
        if (!course) return next(new ErrorHandler('Course not found', 404));
        res.status(200).json({ success: true, data: course });
    } catch (err) {
        console.error('Get course by uuid error:', err);
        return next(new ErrorHandler('Failed to fetch course', 500));
    }
};

exports.createCourse = async (req, res, next) => {
    try {
        const { title, description, test_series_id, thumbnail_url } = req.body;
        if (!title) return next(new ErrorHandler('Title is required', 400));

        if (test_series_id) {
            const testSeries = await TestSeries.findByPk(test_series_id);
            if (!testSeries) return next(new ErrorHandler('Test series not found', 404));

            const existing = await Course.findOne({ where: { test_series_id } });
            if (existing) return next(new ErrorHandler('This test series is already linked to another course', 400));
        }

        const course = await Course.create({
            title,
            description,
            thumbnail_url,
            test_series_id: test_series_id || null,
            educator_id: req.educator.id,
            branch_id: req.educator.branch_id,
            department_id: req.educator.department_id
        });

        res.status(201).json({ success: true, message: 'Course created successfully', data: course });
    } catch (err) {
        console.error('Create course error:', err);
        return next(new ErrorHandler('Failed to create course', 500));
    }
};

exports.updateCourse = async (req, res, next) => {
    try {
        const course = await Course.findOne({ where: { uuid: req.params.uuid, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found', 404));

        const { title, description, thumbnail_url, completion_threshold_percent } = req.body;
        await course.update({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(thumbnail_url !== undefined && { thumbnail_url }),
            ...(completion_threshold_percent !== undefined && { completion_threshold_percent })
        });

        res.status(200).json({ success: true, message: 'Course updated successfully', data: course });
    } catch (err) {
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

exports.createLesson = async (req, res, next) => {
    try {
        const { moduleUuid } = req.params;
        const { title, lesson_type, video_url, content_html, pdf_id, category_id, duration_minutes, is_free_preview } = req.body;

        if (!title || !lesson_type) return next(new ErrorHandler('Title and lesson_type are required', 400));
        if (!['video', 'document', 'quiz', 'live'].includes(lesson_type)) {
            return next(new ErrorHandler('Invalid lesson_type', 400));
        }

        const module = await findOwnedModule(moduleUuid, req.educator.id);
        if (!module) return next(new ErrorHandler('Module not found or not owned by you', 404));

        if (pdf_id) {
            const pdf = await Pdfs.findByPk(pdf_id);
            if (!pdf) return next(new ErrorHandler('PDF not found', 404));
        }
        if (category_id) {
            // Quiz lessons must point at a question_holder Category this educator
            // authored themselves (see EducatorController/quizHierarchyController.js)
            // — this is the same Category model the real quiz-taking screens use.
            const category = await Category.findOne({ where: { id: category_id, educator_id: req.educator.id } });
            if (!category) return next(new ErrorHandler('Quiz category not found or not owned by you', 404));
        }

        const display_order = await Lesson.count({ where: { course_module_id: module.id } });
        const lesson = await Lesson.create({
            course_module_id: module.id,
            title,
            lesson_type,
            video_url: video_url || null,
            content_html: content_html || null,
            pdf_id: pdf_id || null,
            category_id: category_id || null,
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

        const { title, video_url, content_html, pdf_id, category_id, duration_minutes, is_free_preview, is_active } = req.body;
        await lesson.update({
            ...(title !== undefined && { title }),
            ...(video_url !== undefined && { video_url }),
            ...(content_html !== undefined && { content_html }),
            ...(pdf_id !== undefined && { pdf_id }),
            ...(category_id !== undefined && { category_id }),
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
            where: { is_active: true, id: { [Op.notIn]: linkedIds.length ? linkedIds : [0] } },
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
