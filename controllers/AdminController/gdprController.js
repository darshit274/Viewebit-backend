const ErrorHandler = require('../../utils/default/errorHandler');
const {
  User, Educator, TestSession, Subscription, Notification, PushToken,
  LeaderboardEntry, QuestionReport, AssignmentSubmission, LessonProgress,
  LiveSessionAttendance, Certificate, Course, Assignment, LiveSession,
  DataSubjectRequest
} = require('../../models');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidSubjectType(subjectType, next) {
  if (!['student', 'educator'].includes(subjectType)) {
    next(new ErrorHandler('subjectType must be "student" or "educator"', 400));
    return false;
  }
  return true;
}

function assertInstitutionScope(req, subject, next) {
  if (req.admin.role === 'institution_admin' && subject.institution_id !== req.admin.institution_id) {
    next(new ErrorHandler('This record belongs to a different institution', 403));
    return false;
  }
  return true;
}

exports.searchSubject = async (req, res, next) => {
  try {
    const { query, subjectType } = req.query;
    if (!query || !subjectType) {
      return next(new ErrorHandler('query and subjectType are required', 400));
    }
    if (!assertValidSubjectType(subjectType, next)) return;

    const Model = subjectType === 'student' ? User : Educator;
    const idField = subjectType === 'student' ? 'uuid' : 'id';
    const where = UUID_RE.test(query) ? { [idField]: query } : { email: query };

    const subject = await Model.findOne({ where });
    if (!subject) return next(new ErrorHandler('No matching record found', 404));
    if (!assertInstitutionScope(req, subject, next)) return;

    res.status(200).json({
      success: true,
      data: {
        subjectType,
        uuid: subjectType === 'student' ? subject.uuid : subject.id,
        name: subjectType === 'student' ? subject.fullName : subject.name,
        email: subject.email,
        institution_id: subject.institution_id,
        is_anonymized: subject.is_anonymized
      }
    });
  } catch (err) {
    console.error('GDPR search error:', err);
    return next(new ErrorHandler('Failed to search for subject', 500));
  }
};

exports.exportSubject = async (req, res, next) => {
  try {
    const { subjectType, uuid } = req.params;
    if (!assertValidSubjectType(subjectType, next)) return;

    const Model = subjectType === 'student' ? User : Educator;
    const idField = subjectType === 'student' ? 'uuid' : 'id';
    const subject = await Model.findOne({ where: { [idField]: uuid } });
    if (!subject) return next(new ErrorHandler('No matching record found', 404));
    if (!assertInstitutionScope(req, subject, next)) return;

    let payload;
    if (subjectType === 'student') {
      const [
        testSessions, subscriptions, notifications, pushTokens, leaderboardEntries,
        submittedReports, reviewedReports, assignmentSubmissions, lessonProgress,
        liveSessionAttendance, certificates
      ] = await Promise.all([
        TestSession.findAll({ where: { user_id: uuid } }),
        Subscription.findAll({ where: { user_id: uuid } }),
        Notification.findAll({ where: { user_id: uuid } }),
        PushToken.findAll({ where: { user_id: uuid } }),
        LeaderboardEntry.findAll({ where: { user_id: uuid } }),
        QuestionReport.findAll({ where: { user_id: subject.id } }),
        QuestionReport.findAll({ where: { reviewed_by: subject.id } }),
        AssignmentSubmission.findAll({ where: { user_id: uuid } }),
        LessonProgress.findAll({ where: { user_id: uuid } }),
        LiveSessionAttendance.findAll({ where: { user_id: uuid } }),
        Certificate.findAll({ where: { user_id: uuid } })
      ]);

      const {
        password, otp, otpExpiry, current_session_id, device_id,
        ...safeProfile
      } = subject.toJSON();

      payload = {
        subjectType, profile: safeProfile, testSessions, subscriptions, notifications,
        pushTokens, leaderboardEntries, submittedReports, reviewedReports,
        assignmentSubmissions, lessonProgress, liveSessionAttendance, certificates
      };
    } else {
      const [courses, assignments, liveSessions] = await Promise.all([
        Course.findAll({ where: { educator_id: uuid }, attributes: ['uuid', 'title', 'status', 'created_at'] }),
        Assignment.findAll({ where: { educator_id: uuid } }),
        LiveSession.findAll({ where: { educator_id: uuid } })
      ]);

      const {
        password, otp, otpExpiry, reset_otp, reset_otp_expiry, reset_token, reset_token_expiry, current_session_id,
        ...safeProfile
      } = subject.toJSON();

      payload = { subjectType, profile: safeProfile, courses, assignments, liveSessions };
    }

    await DataSubjectRequest.create({
      subject_type: subjectType,
      subject_uuid: uuid,
      request_type: 'export',
      performed_by_admin_id: req.admin.id,
      institution_id: req.admin.institution_id || subject.institution_id || null,
      reason: null
    });

    res.setHeader('Content-Disposition', `attachment; filename="${subjectType}-${uuid}-export.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('GDPR export error:', err);
    return next(new ErrorHandler('Failed to export subject data', 500));
  }
};
