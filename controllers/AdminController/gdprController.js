const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const ErrorHandler = require('../../utils/default/errorHandler');
const {
  User, Educator, TestSession, Subscription, Notification, PushToken,
  LeaderboardEntry, QuestionReport, AssignmentSubmission, LessonProgress,
  LiveSessionAttendance, Certificate, Course, Assignment, LiveSession,
  DataSubjectRequest, sequelize
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
  if (req.admin.role === 'institution_admin') {
    // An institution_admin with no institution of their own has no scope to match
    // against. Without this guard `null !== null` is false, so such an admin would
    // pass the check for every subject that also has a NULL institution_id
    // (e.g. every self-signup consumer student).
    if (req.admin.institution_id === null || req.admin.institution_id === undefined) {
      next(new ErrorHandler('This record belongs to a different institution', 403));
      return false;
    }
    if (subject.institution_id !== req.admin.institution_id) {
      next(new ErrorHandler('This record belongs to a different institution', 403));
      return false;
    }
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

    // Use the subject's own stored identifier from here on, not the raw route param.
    // The lookup above is collation-insensitive (case / trailing spaces), so `uuid`
    // may be a non-canonical spelling of the same value.
    const subjectId = subjectType === 'student' ? subject.uuid : subject.id;

    let payload;
    if (subjectType === 'student') {
      const [
        testSessions, subscriptions, notifications, pushTokens, leaderboardEntries,
        submittedReports, reviewedReports, assignmentSubmissions, lessonProgress,
        liveSessionAttendance, certificates
      ] = await Promise.all([
        TestSession.findAll({ where: { user_id: subjectId } }),
        Subscription.findAll({ where: { user_id: subjectId } }),
        Notification.findAll({ where: { user_id: subjectId } }),
        PushToken.findAll({ where: { user_id: subjectId } }),
        LeaderboardEntry.findAll({ where: { user_id: subjectId } }),
        QuestionReport.findAll({ where: { user_id: subject.id } }),
        QuestionReport.findAll({ where: { reviewed_by: subject.id } }),
        AssignmentSubmission.findAll({ where: { user_id: subjectId } }),
        LessonProgress.findAll({ where: { user_id: subjectId } }),
        LiveSessionAttendance.findAll({ where: { user_id: subjectId } }),
        Certificate.findAll({ where: { user_id: subjectId } })
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
        Course.findAll({ where: { educator_id: subjectId }, attributes: ['uuid', 'title', 'status', 'created_at'] }),
        Assignment.findAll({ where: { educator_id: subjectId } }),
        LiveSession.findAll({ where: { educator_id: subjectId } })
      ]);

      const {
        password, otp, otpExpiry, reset_otp, reset_otp_expiry, reset_token, reset_token_expiry, current_session_id,
        ...safeProfile
      } = subject.toJSON();

      payload = { subjectType, profile: safeProfile, courses, assignments, liveSessions };
    }

    await DataSubjectRequest.create({
      subject_type: subjectType,
      subject_uuid: subjectId,
      request_type: 'export',
      performed_by_admin_id: req.admin.id,
      institution_id: req.admin.institution_id || subject.institution_id || null,
      reason: null
    });

    res.setHeader('Content-Disposition', `attachment; filename="${subjectType}-${subjectId}-export.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('GDPR export error:', err);
    return next(new ErrorHandler('Failed to export subject data', 500));
  }
};

exports.anonymizeSubject = async (req, res, next) => {
  let transaction;
  try {
    const { subjectType, uuid } = req.params;
    const { reason } = req.body;

    if (!assertValidSubjectType(subjectType, next)) return;
    if (!reason || !reason.trim()) {
      return next(new ErrorHandler('A reason is required to anonymize a record', 400));
    }

    const Model = subjectType === 'student' ? User : Educator;
    const idField = subjectType === 'student' ? 'uuid' : 'id';
    const subject = await Model.findOne({ where: { [idField]: uuid } });
    if (!subject) return next(new ErrorHandler('No matching record found', 404));
    if (!assertInstitutionScope(req, subject, next)) return;
    if (subject.is_anonymized) {
      return next(new ErrorHandler('This record has already been anonymized', 400));
    }

    // Use the subject's own stored identifier from here on, not the raw route param.
    // The lookup above is collation-insensitive (case / trailing spaces), so `uuid`
    // may be a non-canonical spelling of the same value.
    const subjectId = subjectType === 'student' ? subject.uuid : subject.id;

    const shortId = String(subjectId).slice(0, 8);
    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    transaction = await sequelize.transaction();

    if (subjectType === 'student') {
      await subject.update({
        username: `deleted_${shortId}`,
        email: `deleted-${shortId}@anonymized.viewebit.local`,
        password: randomPassword,
        fullName: 'Deleted User',
        phone: null,
        phoneNumber: null,
        dateOfBirth: null,
        schoolName: null,
        city: null,
        state: null,
        profileImage: null,
        avatarUrl: null,
        otp: null,
        otpExpiry: null,
        // Must be a fresh unguessable value, NOT null. utils/AuthToken.js only enforces
        // the single-session check when current_session_id is truthy, so nulling it
        // would *disable* the check and leave the subject's existing 30d JWT valid.
        current_session_id: crypto.randomUUID(),
        device_id: null,
        isActive: false,
        is_anonymized: true,
        anonymized_at: new Date()
      }, { transaction });

      // Erased subjects must stop receiving push notifications. The send path only
      // filters on is_active/expires_at, never on isActive/is_anonymized, so the rows
      // have to go. Hard delete matches the existing convention: cleanupExpiredTokens()
      // in services/NotificationService.js already destroys is_active:false rows.
      await PushToken.destroy({ where: { user_id: subjectId }, transaction });
    } else {
      await subject.update({
        email: `deleted-${shortId}@anonymized.viewebit.local`,
        password: randomPassword,
        name: 'Deleted Educator',
        avatar: null,
        bio: null,
        designation: null,
        employee_code: null,
        otp: null,
        otpExpiry: null,
        reset_otp: null,
        reset_otp_expiry: null,
        reset_token: null,
        reset_token_expiry: null,
        current_session_id: null,
        isActive: false,
        is_anonymized: true,
        anonymized_at: new Date()
      }, { transaction });
    }

    await DataSubjectRequest.create({
      subject_type: subjectType,
      subject_uuid: subjectId,
      request_type: 'anonymize',
      performed_by_admin_id: req.admin.id,
      institution_id: req.admin.institution_id || subject.institution_id || null,
      reason: reason.trim()
    }, { transaction });

    await transaction.commit();

    res.status(200).json({ success: true, message: 'Record anonymized successfully' });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('GDPR anonymize error:', err);
    return next(new ErrorHandler('Failed to anonymize record', 500));
  }
};

exports.listRequests = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const where = {};
    if (req.admin.role === 'institution_admin') {
      if (req.admin.institution_id === null || req.admin.institution_id === undefined) {
        // Without this, `where.institution_id = null` compiles to `institution_id IS NULL`
        // and returns every audit row that has no institution. Such an admin has no
        // institution scope, so they see nothing.
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 1 }
        });
      }
      where.institution_id = req.admin.institution_id;
    }

    const { count, rows } = await DataSubjectRequest.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 }
    });
  } catch (err) {
    console.error('GDPR list requests error:', err);
    return next(new ErrorHandler('Failed to load data subject requests', 500));
  }
};
