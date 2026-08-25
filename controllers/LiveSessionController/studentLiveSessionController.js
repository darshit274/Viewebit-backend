const ErrorHandler = require('../../utils/default/errorHandler');
const { LiveSession, LiveSessionAttendance, Course, Educator } = require('../../models');
const { Op } = require('sequelize');

exports.listUpcoming = async (req, res, next) => {
    try {
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

        res.status(200).json({ success: true, data: sessions });
    } catch (err) {
        console.error('List upcoming live sessions error:', err);
        return next(new ErrorHandler('Failed to fetch live sessions', 500));
    }
};

exports.getSessionDetail = async (req, res, next) => {
    try {
        const session = await LiveSession.findOne({
            where: { uuid: req.params.uuid },
            include: [
                { model: Course, as: 'course', attributes: ['id', 'uuid', 'title'] },
                { model: Educator, as: 'educator', attributes: ['id', 'name', 'avatar'] }
            ]
        });
        if (!session) return next(new ErrorHandler('Live session not found', 404));

        res.status(200).json({ success: true, data: session });
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
