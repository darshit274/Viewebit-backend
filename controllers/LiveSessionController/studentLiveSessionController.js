const ErrorHandler = require('../../utils/default/errorHandler');
const { LiveSession, LiveSessionAttendance, Course, Educator } = require('../../models');
const { Op } = require('sequelize');
const { resolveCourseAccessById } = require('../../utils/courseAccess');

exports.listUpcoming = async (req, res, next) => {
    try {
        const userId = req.user?.uuid;
        const sessions = await LiveSession.findAll({
            where: {
                status: { [Op.in]: ['scheduled', 'live'] },
                scheduled_start: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
            },
            include: [
                { model: Course, as: 'course', attributes: ['id', 'uuid', 'title'] },
                { model: Educator, as: 'educator', attributes: ['id', 'name', 'avatar'] }
            ],
            order: [['scheduled_start', 'ASC']]
        });

        const data = await Promise.all(sessions.map(async (session) => {
            const hasAccess = await resolveCourseAccessById(session.course_id, userId);
            if (!hasAccess) {
                // Never hand back meeting_url in the list either.
                return {
                    uuid: session.uuid,
                    title: session.title,
                    scheduled_start: session.scheduled_start,
                    scheduled_end: session.scheduled_end,
                    status: session.status,
                    course: session.course,
                    educator: session.educator,
                    locked: true
                };
            }
            return { ...session.toJSON(), locked: false };
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('List upcoming live sessions error:', err);
        return next(new ErrorHandler('Failed to fetch live sessions', 500));
    }
};

exports.getSessionDetail = async (req, res, next) => {
    try {
        const userId = req.user?.uuid;
        const session = await LiveSession.findOne({
            where: { uuid: req.params.uuid },
            include: [
                { model: Course, as: 'course', attributes: ['id', 'uuid', 'title'] },
                { model: Educator, as: 'educator', attributes: ['id', 'name', 'avatar'] }
            ]
        });
        if (!session) return next(new ErrorHandler('Live session not found', 404));

        const hasAccess = await resolveCourseAccessById(session.course_id, userId);
        if (!hasAccess) {
            // Never hand back meeting_url (or anything else) for a session the
            // student hasn't purchased access to.
            return res.status(200).json({
                success: true,
                data: {
                    uuid: session.uuid,
                    title: session.title,
                    scheduled_start: session.scheduled_start,
                    course: session.course,
                    educator: session.educator,
                    locked: true
                }
            });
        }

        res.status(200).json({ success: true, data: { ...session.toJSON(), locked: false } });
    } catch (err) {
        console.error('Get live session detail error:', err);
        return next(new ErrorHandler('Failed to fetch live session', 500));
    }
};

exports.joinSession = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const session = await LiveSession.findOne({ where: { uuid: req.params.uuid } });
        if (!session) return next(new ErrorHandler('Live session not found', 404));

        const hasAccess = await resolveCourseAccessById(session.course_id, userId);
        if (!hasAccess) {
            return next(new ErrorHandler('Enroll in this course to join this live session', 403));
        }

        const [attendance] = await LiveSessionAttendance.findOrCreate({
            where: { live_session_id: session.id, user_id: userId },
            defaults: { joined_at: new Date() }
        });

        res.status(200).json({
            success: true,
            message: 'Joined session',
            data: { attendance, meeting_url: session.meeting_url, is_embeddable: session.is_embeddable }
        });
    } catch (err) {
        console.error('Join live session error:', err);
        return next(new ErrorHandler('Failed to join live session', 500));
    }
};

exports.leaveSession = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const session = await LiveSession.findOne({ where: { uuid: req.params.uuid } });
        if (!session) return next(new ErrorHandler('Live session not found', 404));

        const attendance = await LiveSessionAttendance.findOne({ where: { live_session_id: session.id, user_id: userId } });
        if (!attendance) return next(new ErrorHandler('No active attendance record found', 404));

        const leftAt = new Date();
        const durationSeconds = Math.max(0, Math.round((leftAt.getTime() - new Date(attendance.joined_at).getTime()) / 1000));
        await attendance.update({ left_at: leftAt, duration_seconds: durationSeconds });

        res.status(200).json({ success: true, message: 'Left session', data: attendance });
    } catch (err) {
        console.error('Leave live session error:', err);
        return next(new ErrorHandler('Failed to record session departure', 500));
    }
};
