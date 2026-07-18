const ErrorHandler = require('../../utils/default/errorHandler');
const { Assignment, AssignmentSubmission, Course, Category, User, TestSession } = require('../../models');

const findOwnedCourse = async (courseUuid, educatorId) => {
    return Course.findOne({ where: { uuid: courseUuid, educator_id: educatorId } });
};

const findOwnedAssignment = async (assignmentUuid, educatorId) => {
    return Assignment.findOne({ where: { uuid: assignmentUuid, educator_id: educatorId } });
};

exports.listAllMyAssignments = async (req, res, next) => {
    try {
        const assignments = await Assignment.findAll({
            where: { educator_id: req.educator.id },
            include: [
                { model: Course, as: 'course', attributes: ['id', 'uuid', 'title'] },
                { model: Category, as: 'quizCategory', attributes: ['id', 'uuid', 'name'] }
            ],
            order: [['created_at', 'DESC']]
        });

        const data = await Promise.all(assignments.map(async (assignment) => {
            let pendingCount = 0;
            if (assignment.submission_type !== 'quiz') {
                pendingCount = await AssignmentSubmission.count({
                    where: { assignment_id: assignment.id, status: ['submitted', 'late'] }
                });
            }
            return { ...assignment.toJSON(), pendingCount };
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('List all my assignments error:', err);
        return next(new ErrorHandler('Failed to fetch assignments', 500));
    }
};

exports.listAssignments = async (req, res, next) => {
    try {
        const { courseUuid } = req.params;
        const course = await findOwnedCourse(courseUuid, req.educator.id);
        if (!course) return next(new ErrorHandler('Course not found or not owned by you', 404));

        const assignments = await Assignment.findAll({
            where: { course_id: course.id },
            include: [{ model: Category, as: 'quizCategory', attributes: ['id', 'uuid', 'name'] }],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({ success: true, data: assignments });
    } catch (err) {
        console.error('List assignments error:', err);
        return next(new ErrorHandler('Failed to fetch assignments', 500));
    }
};

exports.createAssignment = async (req, res, next) => {
    try {
        const { courseUuid } = req.params;
        const { title, description, submission_type, category_id, max_points, due_date, allow_late_submission } = req.body;

        if (!title || !submission_type) return next(new ErrorHandler('Title and submission_type are required', 400));
        if (!['quiz', 'file_upload', 'text'].includes(submission_type)) {
            return next(new ErrorHandler('Invalid submission_type', 400));
        }
        if (submission_type === 'quiz' && !category_id) {
            return next(new ErrorHandler('category_id is required for quiz assignments', 400));
        }

        const course = await findOwnedCourse(courseUuid, req.educator.id);
        if (!course) return next(new ErrorHandler('Course not found or not owned by you', 404));

        if (category_id) {
            const category = await Category.findOne({ where: { id: category_id, educator_id: req.educator.id } });
            if (!category) return next(new ErrorHandler('Quiz category not found or not owned by you', 404));
        }

        const assignment = await Assignment.create({
            course_id: course.id,
            educator_id: req.educator.id,
            title,
            description,
            submission_type,
            category_id: submission_type === 'quiz' ? category_id : null,
            max_points: max_points || 100,
            due_date: due_date || null,
            allow_late_submission: allow_late_submission ?? true
        });

        res.status(201).json({ success: true, message: 'Assignment created successfully', data: assignment });
    } catch (err) {
        console.error('Create assignment error:', err);
        return next(new ErrorHandler('Failed to create assignment', 500));
    }
};

exports.updateAssignment = async (req, res, next) => {
    try {
        const assignment = await findOwnedAssignment(req.params.uuid, req.educator.id);
        if (!assignment) return next(new ErrorHandler('Assignment not found or not owned by you', 404));

        const { title, description, max_points, due_date, allow_late_submission, is_active } = req.body;
        await assignment.update({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(max_points !== undefined && { max_points }),
            ...(due_date !== undefined && { due_date }),
            ...(allow_late_submission !== undefined && { allow_late_submission }),
            ...(is_active !== undefined && { is_active })
        });

        res.status(200).json({ success: true, message: 'Assignment updated successfully', data: assignment });
    } catch (err) {
        console.error('Update assignment error:', err);
        return next(new ErrorHandler('Failed to update assignment', 500));
    }
};

exports.deleteAssignment = async (req, res, next) => {
    try {
        const assignment = await findOwnedAssignment(req.params.uuid, req.educator.id);
        if (!assignment) return next(new ErrorHandler('Assignment not found or not owned by you', 404));

        await assignment.destroy();
        res.status(200).json({ success: true, message: 'Assignment deleted successfully' });
    } catch (err) {
        console.error('Delete assignment error:', err);
        return next(new ErrorHandler('Failed to delete assignment', 500));
    }
};

// Grading -----------------------------------------------------------------

exports.listSubmissions = async (req, res, next) => {
    try {
        const assignment = await findOwnedAssignment(req.params.uuid, req.educator.id);
        if (!assignment) return next(new ErrorHandler('Assignment not found or not owned by you', 404));

        if (assignment.submission_type === 'quiz') {
            // Quiz-type assignments have no file/text submissions to grade manually —
            // results come from existing TestSession data instead. Quiz submissions
            // (routes/quizSubmissionRoutes.js) mint a fresh Test row per attempt, so
            // the only stable link back to a specific quiz is session_data.category_uuid.
            if (!assignment.category_id) return res.status(200).json({ success: true, data: [] });

            const category = await Category.findByPk(assignment.category_id, { attributes: ['uuid'] });
            const allCompleted = await TestSession.findAll({
                where: { status: 'completed' },
                order: [['created_at', 'DESC']]
            });
            const sessions = category
                ? allCompleted.filter((s) => s.session_data?.category_uuid === category.uuid)
                : [];

            const data = await Promise.all(sessions.map(async (session) => {
                const student = await User.findOne({ where: { uuid: session.user_id }, attributes: ['uuid', 'username', 'email'] });
                return {
                    studentUuid: session.user_id,
                    studentName: student?.username,
                    studentEmail: student?.email,
                    score: session.calculated_score,
                    percentage: session.percentage,
                    completedAt: session.completed_at
                };
            }));

            return res.status(200).json({ success: true, data, quizResults: true });
        }

        const submissions = await AssignmentSubmission.findAll({
            where: { assignment_id: assignment.id },
            include: [{ model: User, as: 'student', attributes: ['uuid', 'username', 'email'] }],
            order: [['submitted_at', 'DESC']]
        });

        res.status(200).json({ success: true, data: submissions, quizResults: false });
    } catch (err) {
        console.error('List submissions error:', err);
        return next(new ErrorHandler('Failed to fetch submissions', 500));
    }
};

exports.gradeSubmission = async (req, res, next) => {
    try {
        const { submissionUuid } = req.params;
        const { grade, feedback } = req.body;

        const submission = await AssignmentSubmission.findOne({
            where: { uuid: submissionUuid },
            include: [{ model: Assignment, as: 'assignment', where: { educator_id: req.educator.id } }]
        });
        if (!submission) return next(new ErrorHandler('Submission not found or not owned by you', 404));

        await submission.update({
            grade,
            feedback,
            status: 'graded',
            graded_by: req.educator.id,
            graded_at: new Date()
        });

        res.status(200).json({ success: true, message: 'Submission graded successfully', data: submission });
    } catch (err) {
        console.error('Grade submission error:', err);
        return next(new ErrorHandler('Failed to grade submission', 500));
    }
};
