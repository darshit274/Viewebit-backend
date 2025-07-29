const ErrorHandler = require('../../utils/default/errorHandler');
const { Question, Test, TestSeries } = require('../../models');
const { Op } = require('sequelize');

// Get all questions with pagination and filters
exports.getQuestions = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const subject = req.query.subject || '';
        const difficulty = req.query.difficulty || '';
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        const offset = (page - 1) * limit;

        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { question_text: { [Op.like]: `%${search}%` } },
                { topic: { [Op.like]: `%${search}%` } }
            ];
        }
        if (subject) {
            whereClause.subject = subject;
        }
        if (difficulty) {
            whereClause.difficulty = difficulty;
        }

        const { count, rows } = await Question.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            attributes: {
                exclude: ['correct_answer'] // Don't send correct answer in list view
            }
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        console.error('Get questions error:', err);
        const error = new ErrorHandler('Failed to fetch questions', 500);
        return next(error);
    }
};

// Get single question by ID (with correct answer for admin)
exports.getQuestionById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const question = await Question.findByPk(id);
        if (!question) {
            return next(new ErrorHandler('Question not found', 404));
        }

        res.status(200).json({
            success: true,
            data: question
        });
    } catch (err) {
        console.error('Get question by ID error:', err);
        const error = new ErrorHandler('Failed to fetch question', 500);
        return next(error);
    }
};

// Create new question
exports.createQuestion = async (req, res, next) => {
    try {
        const {
            question_text,
            question_text_gujarati,
            option_a,
            option_a_gujarati,
            option_b,
            option_b_gujarati,
            option_c,
            option_c_gujarati,
            option_d,
            option_d_gujarati,
            correct_answer,
            explanation,
            explanation_gujarati,
            difficulty,
            subject,
            topic
        } = req.body;

        // Validate correct answer
        if (!['A', 'B', 'C', 'D'].includes(correct_answer)) {
            return next(new ErrorHandler('Correct answer must be A, B, C, or D', 400));
        }

        const question = await Question.create({
            question_text,
            question_text_gujarati,
            option_a,
            option_a_gujarati,
            option_b,
            option_b_gujarati,
            option_c,
            option_c_gujarati,
            option_d,
            option_d_gujarati,
            correct_answer,
            explanation,
            explanation_gujarati,
            difficulty,
            subject,
            topic,
            created_by: req.admin.id
        });

        res.status(201).json({
            success: true,
            message: 'Question created successfully',
            data: question
        });
    } catch (err) {
        console.error('Create question error:', err);
        const error = new ErrorHandler('Failed to create question', 500);
        return next(error);
    }
};

// Update question
exports.updateQuestion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const question = await Question.findByPk(id);
        if (!question) {
            return next(new ErrorHandler('Question not found', 404));
        }

        // Validate correct answer if being updated
        if (updateData.correct_answer && !['A', 'B', 'C', 'D'].includes(updateData.correct_answer)) {
            return next(new ErrorHandler('Correct answer must be A, B, C, or D', 400));
        }

        await question.update(updateData);

        res.status(200).json({
            success: true,
            message: 'Question updated successfully',
            data: question
        });
    } catch (err) {
        console.error('Update question error:', err);
        const error = new ErrorHandler('Failed to update question', 500);
        return next(error);
    }
};

// Delete question
exports.deleteQuestion = async (req, res, next) => {
    try {
        const { id } = req.params;

        const question = await Question.findByPk(id);
        if (!question) {
            return next(new ErrorHandler('Question not found', 404));
        }

        await question.destroy();

        res.status(200).json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (err) {
        console.error('Delete question error:', err);
        const error = new ErrorHandler('Failed to delete question', 500);
        return next(error);
    }
};

// Bulk create questions from CSV/JSON
exports.bulkCreateQuestions = async (req, res, next) => {
    try {
        const { questions } = req.body;

        if (!Array.isArray(questions) || questions.length === 0) {
            return next(new ErrorHandler('Question array is required', 400));
        }

        // Validate each question
        const validQuestion = [];
        const errors = [];

        questions.forEach((q, index) => {
            if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d || !q.correct_answer) {
                errors.push(`Question ${index + 1}: Missing required fields`);
                return;
            }

            if (!['A', 'B', 'C', 'D'].includes(q.correct_answer)) {
                errors.push(`Question ${index + 1}: Invalid correct answer`);
                return;
            }

            validQuestion.push({
                ...q,
                created_by: req.admin.id
            });
        });

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors found',
                errors
            });
        }

        const createdQuestion = await Question.bulkCreate(validQuestion);

        res.status(201).json({
            success: true,
            message: `${createdQuestion.length} questions created successfully`,
            data: {
                created_count: createdQuestion.length,
                total_submitted: questions.length
            }
        });
    } catch (err) {
        console.error('Bulk create questions error:', err);
        const error = new ErrorHandler('Failed to create questions', 500);
        return next(error);
    }
};

// Get questions statistics
exports.getQuestionsStats = async (req, res, next) => {
    try {
        const totalQuestion = await Question.count();
        
        // Get difficulty-wise count
        const difficultyStats = await Question.findAll({
            attributes: [
                'difficulty',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['difficulty'],
            order: [['difficulty', 'ASC']]
        });

        // Get subject-wise count
        const subjectStats = await Question.findAll({
            attributes: [
                'subject',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['subject'],
            order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
            limit: 10
        });

        res.status(200).json({
            success: true,
            data: {
                total_questions: totalQuestion,
                difficulty_stats: difficultyStats,
                subject_stats: subjectStats
            }
        });
    } catch (err) {
        console.error('Get questions stats error:', err);
        const error = new ErrorHandler('Failed to fetch questions statistics', 500);
        return next(error);
    }
};

// Get unique subjects and topics for filters
exports.getQuestionFilters = async (req, res, next) => {
    try {
        const subjects = await Question.findAll({
            attributes: ['subject'],
            group: ['subject'],
            order: [['subject', 'ASC']]
        });

        const topics = await Question.findAll({
            attributes: ['topic', 'subject'],
            group: ['topic', 'subject'],
            order: [['subject', 'ASC'], ['topic', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: {
                subjects: subjects.map(s => s.subject),
                topics: topics.reduce((acc, t) => {
                    if (!acc[t.subject]) {
                        acc[t.subject] = [];
                    }
                    acc[t.subject].push(t.topic);
                    return acc;
                }, {})
            }
        });
    } catch (err) {
        console.error('Get question filters error:', err);
        const error = new ErrorHandler('Failed to fetch question filters', 500);
        return next(error);
    }
};