const ErrorHandler = require('../../utils/default/errorHandler');
const { LiveSession, LiveSessionAttendance, Course, User } = require('../../models');

const findOwnedSession = async (uuid, educatorId) => {
    return LiveSession.findOne({ where: { uuid, educator_id: educatorId } });
};

exports.listMySessions = async (req, res, next) => {
    try {
        const sessions = await LiveSession.findAll({
            where: { educator_id: req.educator.id },
            include: [{ model: Course, as: 'course', attributes: ['id', 'uuid', 'title'] }],
            order: [['scheduled_start', 'DESC']]
        });

        const data = await Promise.all(sessions.map(async (session) => {
            const attendeeCount = await LiveSessionAttendance.count({ where: { live_session_id: session.id } });
            return { ...session.toJSON(), attendeeCount };
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('List my live sessions error:', err);
        return next(new ErrorHandler('Failed to fetch live sessions', 500));
    }
};

exports.createSession = async (req, res, next) => {
    try {
        const { course_id, title, description, scheduled_start, scheduled_end, meeting_provider, meeting_url } = req.body;

        if (!title || !scheduled_start || !meeting_url) {
            return next(new ErrorHandler('Title, scheduled_start and meeting_url are required', 400));
        }

        if (course_id) {
            const course = await Course.findOne({ where: { id: course_id, educator_id: req.educator.id } });
            if (!course) return next(new ErrorHandler('Course not found or not owned by you', 404));
        }

        const session = await LiveSession.create({
            course_id: course_id || null,
            educator_id: req.educator.id,
            title,
            description,
            scheduled_start,
            scheduled_end: scheduled_end || null,
            meeting_provider: meeting_provider || 'other',
            meeting_url,
            is_embeddable: meeting_provider === 'jitsi'
        });

        res.status(201).json({ success: true, message: 'Live session scheduled successfully', data: session });
    } catch (err) {
        console.error('Create live session error:', err);
        return next(new ErrorHandler('Failed to schedule live session', 500));
    }
};

exports.updateSession = async (req, res, next) => {
    try {
        const session = await findOwnedSession(req.params.uuid, req.educator.id);
        if (!session) return next(new ErrorHandler('Live session not found or not owned by you', 404));

        const { title, description, scheduled_start, scheduled_end, meeting_provider, meeting_url, status } = req.body;
        await session.update({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(scheduled_start !== undefined && { scheduled_start }),
            ...(scheduled_end !== undefined && { scheduled_end }),
            ...(meeting_provider !== undefined && { meeting_provider, is_embeddable: meeting_provider === 'jitsi' }),
            ...(meeting_url !== undefined && { meeting_url }),
            ...(status !== undefined && { status })
        });

        res.status(200).json({ success: true, message: 'Live session updated successfully', data: session });
    } catch (err) {
        console.error('Update live session error:', err);
        return next(new ErrorHandler('Failed to update live session', 500));
    }
};

exports.cancelSession = async (req, res, next) => {
    try {
        const session = await findOwnedSession(req.params.uuid, req.educator.id);
        if (!session) return next(new ErrorHandler('Live session not found or not owned by you', 404));

        session.status = 'cancelled';
        await session.save();

        res.status(200).json({ success: true, message: 'Live session cancelled', data: session });
    } catch (err) {
        console.error('Cancel live session error:', err);
        return next(new ErrorHandler('Failed to cancel live session', 500));
    }
};

exports.getAttendanceReport = async (req, res, next) => {
    try {
        const session = await findOwnedSession(req.params.uuid, req.educator.id);
        if (!session) return next(new ErrorHandler('Live session not found or not owned by you', 404));

        const attendance = await LiveSessionAttendance.findAll({
            where: { live_session_id: session.id },
            include: [{ model: User, as: 'student', attributes: ['uuid', 'username', 'email'] }],
            order: [['joined_at', 'ASC']]
        });

        res.status(200).json({ success: true, data: attendance });
    } catch (err) {
        console.error('Get attendance report error:', err);
        return next(new ErrorHandler('Failed to fetch attendance report', 500));
    }
};
