const ErrorHandler = require('../../utils/default/errorHandler');
const { Course, Subscription, Assignment, AssignmentSubmission } = require('../../models');
const { Op } = require('sequelize');

exports.getDashboardStats = async (req, res, next) => {
    try {
        const courses = await Course.findAll({ where: { educator_id: req.educator.id } });
        const totalCourses = courses.length;

        const testSeriesIds = courses.map((c) => c.test_series_id).filter(Boolean);
        const totalStudents = testSeriesIds.length
            ? await Subscription.count({ where: { test_series_id: testSeriesIds, status: 'completed' } })
            : 0;

        const assignmentIds = (await Assignment.findAll({
            where: { educator_id: req.educator.id, submission_type: { [Op.in]: ['file_upload', 'text'] } },
            attributes: ['id']
        })).map((a) => a.id);

        const pendingGrading = assignmentIds.length
            ? await AssignmentSubmission.count({ where: { assignment_id: assignmentIds, status: { [Op.in]: ['submitted', 'late'] } } })
            : 0;

        // Upcoming live sessions lands on real data in Phase 5 (LiveSession model).
        const upcomingLiveSessions = 0;

        res.status(200).json({
            success: true,
            data: { totalCourses, totalStudents, pendingGrading, upcomingLiveSessions }
        });
    } catch (err) {
        console.error('Get educator dashboard stats error:', err);
        return next(new ErrorHandler('Failed to fetch dashboard stats', 500));
    }
};
