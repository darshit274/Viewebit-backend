const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ErrorHandler = require('../../utils/default/errorHandler');
const { Assignment, AssignmentSubmission, Course, Category, TestSession } = require('../../models');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/assignment_submissions');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueId = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `submission_${uniqueId}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

exports.uploadMiddleware = upload.single('file');

// List assignments across the courses the student has access to.
exports.listMyAssignments = async (req, res, next) => {
    try {
        const userId = req.user.uuid;

        // Only surface assignments belonging to published courses — course-level
        // access gating (free vs paid) is enforced at submission time, not listing time,
        // so students can at least see what's due.
        const assignments = await Assignment.findAll({
            where: { is_active: true },
            include: [{ model: Course, as: 'course', where: { status: 'published' }, attributes: ['id', 'uuid', 'title'] }],
            order: [['due_date', 'ASC']]
        });

        const data = await Promise.all(assignments.map(async (assignment) => {
            const existing = await AssignmentSubmission.findOne({ where: { assignment_id: assignment.id, user_id: userId } });
            return {
                uuid: assignment.uuid,
                title: assignment.title,
                submission_type: assignment.submission_type,
                due_date: assignment.due_date,
                max_points: assignment.max_points,
                course: assignment.course,
                submissionStatus: existing ? existing.status : 'not_started',
                grade: existing?.grade ?? null
            };
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('List my assignments error:', err);
        return next(new ErrorHandler('Failed to fetch assignments', 500));
    }
};

exports.getAssignmentDetail = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const assignment = await Assignment.findOne({
            where: { uuid: req.params.uuid },
            include: [
                { model: Course, as: 'course', attributes: ['id', 'uuid', 'title'] },
                { model: Category, as: 'quizCategory', attributes: ['id', 'uuid', 'name'] }
            ]
        });
        if (!assignment) return next(new ErrorHandler('Assignment not found', 404));

        const submission = await AssignmentSubmission.findOne({ where: { assignment_id: assignment.id, user_id: userId } });

        // Quiz submissions (routes/quizSubmissionRoutes.js) mint a fresh Test row
        // per attempt, so the only stable link back to this quiz is
        // session_data.category_uuid — matched in JS against this user's completed sessions.
        let quizResult = null;
        if (assignment.submission_type === 'quiz' && assignment.quizCategory) {
            const completedSessions = await TestSession.findAll({
                where: { user_id: userId, status: 'completed' },
                order: [['created_at', 'DESC']]
            });
            quizResult = completedSessions.find((s) => s.session_data?.category_uuid === assignment.quizCategory.uuid) || null;
        }

        res.status(200).json({ success: true, data: { ...assignment.toJSON(), submission, quizResult } });
    } catch (err) {
        console.error('Get assignment detail error:', err);
        return next(new ErrorHandler('Failed to fetch assignment', 500));
    }
};

exports.submitAssignment = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const assignment = await Assignment.findOne({ where: { uuid: req.params.uuid } });
        if (!assignment) return next(new ErrorHandler('Assignment not found', 404));

        if (assignment.submission_type === 'quiz') {
            return next(new ErrorHandler('Quiz assignments are completed via the test-taking flow, not file/text submission', 400));
        }

        const isLate = assignment.due_date && new Date() > new Date(assignment.due_date);
        if (isLate && !assignment.allow_late_submission) {
            return next(new ErrorHandler('The due date for this assignment has passed', 400));
        }

        const { submission_text } = req.body;
        let file_url = null;
        if (req.file) {
            const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
            file_url = `${serverUrl}/uploads/assignment_submissions/${req.file.filename}`;
        }

        if (assignment.submission_type === 'file_upload' && !file_url) {
            return next(new ErrorHandler('A file is required for this assignment', 400));
        }
        if (assignment.submission_type === 'text' && !submission_text) {
            return next(new ErrorHandler('Text submission is required for this assignment', 400));
        }

        const [submission, created] = await AssignmentSubmission.findOrCreate({
            where: { assignment_id: assignment.id, user_id: userId },
            defaults: {
                submission_text: submission_text || null,
                file_url,
                submitted_at: new Date(),
                status: isLate ? 'late' : 'submitted'
            }
        });

        if (!created) {
            await submission.update({
                submission_text: submission_text || submission.submission_text,
                file_url: file_url || submission.file_url,
                submitted_at: new Date(),
                status: isLate ? 'late' : 'submitted',
                grade: null,
                feedback: null,
                graded_by: null,
                graded_at: null
            });
        }

        res.status(created ? 201 : 200).json({ success: true, message: 'Assignment submitted successfully', data: submission });
    } catch (err) {
        console.error('Submit assignment error:', err);
        return next(new ErrorHandler('Failed to submit assignment', 500));
    }
};
