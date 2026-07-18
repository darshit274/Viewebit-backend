// Viewebit-backend/controllers/EducatorController/studentInsightsController.js
const ErrorHandler = require('../../utils/default/errorHandler');
const { Course, CourseModule, Lesson, LessonProgress, Subscription, TestSession, User } = require('../../models');
const { Op } = require('sequelize');
const { getEducatorCourses, getEducatorCategoryIds } = require('../../utils/educatorScope');

exports.listStudents = async (req, res, next) => {
    try {
        const { search = '', access_type = 'all', page = 1, limit = 20 } = req.query;
        const educatorId = req.educator.id;

        const courses = await getEducatorCourses(educatorId);
        const courseIds = courses.map((c) => c.id);
        const courseIdToTitle = new Map(courses.map((c) => [c.id, c.title]));
        const testSeriesIdToCourse = new Map(courses.filter((c) => c.test_series_id).map((c) => [c.test_series_id, c]));
        const testSeriesIds = [...testSeriesIdToCourse.keys()];
        const { uuids: categoryUuids } = await getEducatorCategoryIds(educatorId);

        const studentMap = new Map();
        const touch = (userId) => {
            if (!studentMap.has(userId)) {
                studentMap.set(userId, { accessTypes: new Set(), courseTitles: new Set(), lastActivity: null, quizAttempts: 0, name: null, email: null });
            }
            return studentMap.get(userId);
        };
        const bumpActivity = (entry, date) => {
            if (date && (!entry.lastActivity || new Date(date) > entry.lastActivity)) entry.lastActivity = new Date(date);
        };

        // Path 1: paid — Subscription rows against this educator's test series
        if (testSeriesIds.length > 0) {
            const subs = await Subscription.findAll({
                where: { test_series_id: testSeriesIds, status: 'completed' },
                include: [{ model: User, as: 'user', attributes: ['uuid', 'username', 'email'] }],
            });
            subs.forEach((sub) => {
                if (!sub.user) return;
                const entry = touch(sub.user.uuid);
                entry.accessTypes.add('paid');
                entry.name = sub.user.username;
                entry.email = sub.user.email;
                const course = testSeriesIdToCourse.get(sub.test_series_id);
                if (course) entry.courseTitles.add(course.title);
                bumpActivity(entry, sub.purchase_date);
            });
        }

        // Path 2: free/paid course engagement — LessonProgress through this educator's Course -> CourseModule -> Lesson chain
        if (courseIds.length > 0) {
            const modules = await CourseModule.findAll({ where: { course_id: courseIds }, attributes: ['id', 'course_id'] });
            const moduleIdToCourseId = new Map(modules.map((m) => [m.id, m.course_id]));
            const moduleIds = modules.map((m) => m.id);

            if (moduleIds.length > 0) {
                const lessons = await Lesson.findAll({ where: { course_module_id: moduleIds }, attributes: ['id', 'course_module_id'] });
                const lessonIdToCourseId = new Map(lessons.map((l) => [l.id, moduleIdToCourseId.get(l.course_module_id)]));
                const lessonIds = lessons.map((l) => l.id);

                if (lessonIds.length > 0) {
                    const progress = await LessonProgress.findAll({
                        where: { lesson_id: lessonIds },
                        include: [{ model: User, as: 'user', attributes: ['uuid', 'username', 'email'] }],
                    });
                    progress.forEach((p) => {
                        if (!p.user) return;
                        const entry = touch(p.user.uuid);
                        entry.accessTypes.add('free');
                        entry.name = p.user.username;
                        entry.email = p.user.email;
                        const title = courseIdToTitle.get(lessonIdToCourseId.get(p.lesson_id));
                        if (title) entry.courseTitles.add(title);
                        bumpActivity(entry, p.updated_at || p.completed_at);
                    });
                }
            }
        }

        // Path 3: quiz-only attempts — completed TestSessions matching this educator's category tree
        if (categoryUuids.length > 0) {
            const completedSessions = await TestSession.findAll({ where: { status: 'completed' } });
            const scoped = completedSessions.filter((s) => categoryUuids.includes(s.session_data?.category_uuid));
            const userIds = [...new Set(scoped.map((s) => s.user_id))];
            if (userIds.length > 0) {
                const users = await User.findAll({ where: { uuid: userIds }, attributes: ['uuid', 'username', 'email'] });
                const userMap = new Map(users.map((u) => [u.uuid, u]));
                scoped.forEach((s) => {
                    const user = userMap.get(s.user_id);
                    if (!user) return;
                    const entry = touch(s.user_id);
                    entry.accessTypes.add('quiz');
                    entry.name = user.username;
                    entry.email = user.email;
                    entry.quizAttempts += 1;
                    bumpActivity(entry, s.completed_at);
                });
            }
        }

        let students = Array.from(studentMap.entries()).map(([uuid, entry]) => ({
            uuid,
            name: entry.name,
            email: entry.email,
            courses: Array.from(entry.courseTitles),
            accessType: entry.accessTypes.has('paid') ? 'paid' : entry.accessTypes.has('free') ? 'free' : 'quiz',
            lastActivity: entry.lastActivity,
            quizAttempts: entry.quizAttempts,
        }));

        if (search) {
            const s = String(search).toLowerCase();
            students = students.filter((st) => st.name?.toLowerCase().includes(s) || st.email?.toLowerCase().includes(s));
        }
        if (access_type !== 'all') {
            students = students.filter((st) => st.accessType === access_type);
        }

        students.sort((a, b) => (b.lastActivity ? new Date(b.lastActivity).getTime() : 0) - (a.lastActivity ? new Date(a.lastActivity).getTime() : 0));

        const total = students.length;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const paged = students.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        res.status(200).json({
            success: true,
            data: paged,
            pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        console.error('List students error:', err);
        return next(new ErrorHandler('Failed to fetch students', 500));
    }
};
