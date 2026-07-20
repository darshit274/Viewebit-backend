// Viewebit-backend/controllers/EducatorController/studentInsightsController.js
const crypto = require('crypto');
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

exports.listTestAttempts = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const { uuids: categoryUuids } = await getEducatorCategoryIds(req.educator.id);
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        if (categoryUuids.length === 0) {
            return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 } });
        }

        const sessions = await TestSession.findAll({ where: { status: 'completed' }, order: [['created_at', 'DESC']] });
        const scoped = sessions.filter((s) => categoryUuids.includes(s.session_data?.category_uuid));

        const grouped = new Map();
        scoped.forEach((s) => {
            if (!grouped.has(s.user_id)) grouped.set(s.user_id, []);
            grouped.get(s.user_id).push(s);
        });

        let userIds = [...grouped.keys()];
        if (search) {
            const like = `%${search}%`;
            const matchingUsers = await User.findAll({
                where: { uuid: userIds, [Op.or]: [{ username: { [Op.like]: like } }, { email: { [Op.like]: like } }] },
                attributes: ['uuid'],
            });
            const allowed = new Set(matchingUsers.map((u) => u.uuid));
            userIds = userIds.filter((id) => allowed.has(id));
        }

        const users = await User.findAll({ where: { uuid: userIds }, attributes: ['uuid', 'username', 'email'] });
        const userMap = new Map(users.map((u) => [u.uuid, u]));

        let rows = userIds.map((uid) => {
            const userSessions = grouped.get(uid).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const latest = userSessions[0];
            const user = userMap.get(uid);
            return {
                studentUuid: uid,
                studentName: user?.username || null,
                studentEmail: user?.email || null,
                totalAttempts: userSessions.length,
                completedAttempts: userSessions.length,
                latestAttempt: {
                    sessionId: latest.id,
                    categoryName: latest.category_name,
                    percentage: latest.percentage,
                    finalScore: latest.final_score,
                    completedAt: latest.completed_at,
                },
            };
        });

        rows.sort((a, b) => new Date(b.latestAttempt.completedAt || 0) - new Date(a.latestAttempt.completedAt || 0));

        const total = rows.length;
        const paged = rows.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        res.status(200).json({ success: true, data: paged, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
    } catch (err) {
        console.error('List test attempts error:', err);
        return next(new ErrorHandler('Failed to fetch test attempts', 500));
    }
};

exports.getStudentTestAttempts = async (req, res, next) => {
    try {
        const { studentUuid } = req.params;
        const { uuids: categoryUuids } = await getEducatorCategoryIds(req.educator.id);

        const user = await User.findOne({ where: { uuid: studentUuid }, attributes: ['uuid', 'username', 'email'] });
        if (!user) return next(new ErrorHandler('Student not found', 404));

        const sessions = await TestSession.findAll({ where: { user_id: studentUuid, status: 'completed' }, order: [['created_at', 'DESC']] });
        const scoped = sessions.filter((s) => categoryUuids.includes(s.session_data?.category_uuid));

        const attempts = scoped.map((s) => ({
            sessionId: s.id,
            categoryName: s.category_name,
            percentage: s.percentage,
            finalScore: s.final_score,
            totalCorrect: s.total_correct,
            totalWrong: s.total_wrong,
            totalQuestions: s.total_questions,
            timeSpentSeconds: s.time_spent_seconds,
            completedAt: s.completed_at,
        }));

        res.status(200).json({
            success: true,
            data: { student: { uuid: user.uuid, name: user.username, email: user.email }, attempts },
        });
    } catch (err) {
        console.error('Get student test attempts error:', err);
        return next(new ErrorHandler('Failed to fetch student test attempts', 500));
    }
};

exports.listSubscriptions = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const courses = await getEducatorCourses(req.educator.id);
        const testSeriesIdToCourse = new Map(courses.filter((c) => c.test_series_id).map((c) => [c.test_series_id, c]));
        const testSeriesIds = [...testSeriesIdToCourse.keys()];

        if (testSeriesIds.length === 0) {
            return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 } });
        }

        const whereClause = { test_series_id: testSeriesIds };
        if (status !== 'all') whereClause.status = status;

        const includeClause = [{ model: User, as: 'user', attributes: ['uuid', 'username', 'email'], required: false }];
        if (search) {
            includeClause[0].where = { [Op.or]: [{ username: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }] };
            includeClause[0].required = true;
        }

        const { count, rows } = await Subscription.findAndCountAll({
            where: whereClause,
            include: includeClause,
            limit: limitNum,
            offset: (pageNum - 1) * limitNum,
            order: [['purchase_date', 'DESC']],
        });

        const data = rows.map((sub) => {
            const course = testSeriesIdToCourse.get(sub.test_series_id);
            return {
                id: sub.id,
                student: sub.user ? { uuid: sub.user.uuid, name: sub.user.username, email: sub.user.email } : null,
                courseTitle: course?.title || null,
                amountPaid: sub.amount_paid,
                currency: sub.currency,
                status: sub.status,
                purchaseDate: sub.purchase_date,
                expiryDate: sub.expiry_date,
            };
        });

        res.status(200).json({ success: true, data, pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) } });
    } catch (err) {
        console.error('List subscriptions error:', err);
        return next(new ErrorHandler('Failed to fetch subscriptions', 500));
    }
};

exports.getSubscriptionStats = async (req, res, next) => {
    try {
        const courses = await getEducatorCourses(req.educator.id);
        const testSeriesIds = [...new Set(courses.filter((c) => c.test_series_id).map((c) => c.test_series_id))];

        if (testSeriesIds.length === 0) {
            return res.status(200).json({ success: true, data: { total: 0, active: 0, expired: 0, totalRevenue: 0 } });
        }

        const now = new Date();
        const baseWhere = { test_series_id: testSeriesIds, status: 'completed' };

        const [total, active, totalRevenue] = await Promise.all([
            Subscription.count({ where: baseWhere }),
            Subscription.count({ where: { ...baseWhere, [Op.or]: [{ expiry_date: null }, { expiry_date: { [Op.gt]: now } }] } }),
            Subscription.sum('amount_paid', { where: baseWhere }),
        ]);

        res.status(200).json({ success: true, data: { total, active, expired: total - active, totalRevenue: totalRevenue || 0 } });
    } catch (err) {
        console.error('Get subscription stats error:', err);
        return next(new ErrorHandler('Failed to fetch subscription stats', 500));
    }
};

exports.createManualSubscription = async (req, res, next) => {
    try {
        const { student_email, course_uuid } = req.body;
        if (!student_email || !course_uuid) {
            return next(new ErrorHandler('student_email and course_uuid are required', 400));
        }

        const course = await Course.findOne({ where: { uuid: course_uuid, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found or not owned by you', 404));
        if (!course.test_series_id) return next(new ErrorHandler('This course has no linked test series to grant access to', 400));

        const student = await User.findOne({ where: { email: student_email } });
        if (!student) return next(new ErrorHandler('No student found with that email', 404));

        const existing = await Subscription.findOne({
            where: { user_id: student.uuid, test_series_id: course.test_series_id, status: 'completed' },
        });
        if (existing) return next(new ErrorHandler('This student already has access to this course', 400));

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 365);

        const subscription = await Subscription.create({
            user_id: student.uuid,
            test_series_id: course.test_series_id,
            transaction_id: `EDU-GRANT-${crypto.randomUUID()}`,
            payment_method: 'manual_grant',
            amount_paid: 0,
            currency: 'INR',
            status: 'completed',
            purchase_date: new Date(),
            expiry_date: expiryDate,
            metadata: { granted_by_educator_id: req.educator.id, granted_by_educator: true },
        });

        res.status(201).json({ success: true, message: 'Access granted successfully', data: subscription });
    } catch (err) {
        console.error('Create manual subscription error:', err);
        return next(new ErrorHandler('Failed to grant access', 500));
    }
};
