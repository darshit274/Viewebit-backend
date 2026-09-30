// Shared course-access check, used by every student-facing controller that
// gates content on course purchase: lessons (studentCourseController.js),
// assignments, and live sessions. A course is free if it has no linked
// TestSeries or that TestSeries is free; otherwise it requires a completed,
// unexpired Subscription for that test_series_id — the same check the
// course's own linked TestSeries purchase flow relies on.
const { Course, TestSeries, Subscription } = require('../models');
const { Op } = require('sequelize');

async function resolveCourseAccess(course, userId) {
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
}

// Convenience wrapper for callers that only have a course_id on hand
// (Assignment/LiveSession reference Course by id, not a preloaded instance
// with testSeries already joined).
async function resolveCourseAccessById(courseId, userId) {
    if (!courseId) return true; // not attached to any course — nothing to gate
    const course = await Course.findByPk(courseId, {
        include: [{ model: TestSeries, as: 'testSeries', attributes: ['id', 'pricing_type'] }]
    });
    if (!course) return false;
    return resolveCourseAccess(course, userId);
}

module.exports = { resolveCourseAccess, resolveCourseAccessById };
