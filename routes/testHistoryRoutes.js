const express = require('express');
const router = express.Router();
const { TestSession, Test, Category, SubCategory, TestSeries, Question, User, UserAnswer, sequelize } = require('../models');
const { Op } = require('sequelize');
const AuthToken = require('../utils/AuthToken');

console.log('🚀 Test History Routes loaded successfully!');

// Middleware for required authentication
const requireAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const decoded = AuthToken.verifyToken(token);
        const userUuid = decoded.uuid || decoded.id;
        const user = await User.findOne({ where: { uuid: userUuid } });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        req.user = {
            ...user.toJSON(),
            id: user.uuid,
            uuid: user.uuid
        };

        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

/**
 * Get user test history list - GROUPED BY TEST
 * GET /api/test-history
 * Query params: ?page=1&limit=10&sort=date_desc
 *
 * This returns ONE entry per unique test, showing:
 * - Latest attempt details
 * - Total attempts count
 * - Best score achieved
 * - Latest attempt date
 *
 * Requires authentication - user ID extracted from JWT token
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.uuid;
        const { page = 1, limit = 10, sort = 'date_desc' } = req.query;

        console.log(`📚 Fetching GROUPED test history for user: ${userId}`);

        // Get all completed test sessions for this user with FULL HIERARCHY
        const allSessions = await TestSession.findAll({
            where: {
                user_id: userId,
                status: 'completed',
                is_completed: true
            },
            attributes: [
                'id', 'test_id', 'completed_at', 'started_at',
                'calculated_score', 'total_questions',
                'total_correct', 'total_wrong', 'total_unanswered'
            ],
            include: [{
                model: Test,
                as: 'test',
                attributes: ['id', 'title', 'uuid', 'title_gujarati', 'is_free_in_paid_series'],
                include: [{
                    model: SubCategory,
                    as: 'subCategory',
                    attributes: ['id', 'name', 'uuid'],
                    include: [{
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'uuid', 'name_gujarati', 'test_series_id'],
                        include: [{
                            model: TestSeries,
                            as: 'testSeries',
                            attributes: ['id', 'name', 'uuid', 'name_gujarati', 'pricing_type']
                        }]
                    }]
                }]
            }],
            order: [['completed_at', 'DESC']]
        });

        // Group sessions by test_id
        const groupedTests = {};

        allSessions.forEach(session => {
            const testId = session.test_id;

            if (!groupedTests[testId]) {
                // Extract hierarchy information
                const test = session.test;
                const subCategory = test?.subCategory;
                const category = subCategory?.category;
                const testSeries = category?.testSeries;

                // Build hierarchy path
                const hierarchyParts = [];
                if (testSeries?.name) hierarchyParts.push(testSeries.name);
                if (category?.name) hierarchyParts.push(category.name);
                if (subCategory?.name) hierarchyParts.push(subCategory.name);

                const hierarchyPath = hierarchyParts.length > 0
                    ? hierarchyParts.join(' → ')
                    : 'General';

                groupedTests[testId] = {
                    testId: testId,
                    testName: test?.title || 'Quiz Test',
                    testNameGujarati: test?.title_gujarati,
                    testUuid: test?.uuid,
                    // Hierarchy information
                    testSeriesName: testSeries?.name || 'General',
                    testSeriesNameGujarati: testSeries?.name_gujarati,
                    testSeriesUuid: testSeries?.uuid,
                    categoryName: category?.name || 'General',
                    categoryNameGujarati: category?.name_gujarati,
                    categoryUuid: category?.uuid,
                    subCategoryName: subCategory?.name,
                    subCategoryUuid: subCategory?.uuid,
                    hierarchyPath: hierarchyPath,
                    isFreeInPaidSeries: test?.is_free_in_paid_series || false,
                    pricingType: testSeries?.pricing_type || 'free',
                    // Attempt tracking
                    attempts: [],
                    latestAttempt: null,
                    bestScore: 0,
                    bestPercentage: 0,
                    totalAttempts: 0
                };
            }

            // Calculate percentage for this session
            const percentage = session.total_questions > 0
                ? Math.round((session.calculated_score / session.total_questions) * 100)
                : 0;

            // Add this session to attempts
            groupedTests[testId].attempts.push({
                sessionId: session.id,
                completedAt: session.completed_at,
                score: parseFloat(session.calculated_score || 0),
                percentage: percentage,
                totalQuestions: session.total_questions,
                correct: session.total_correct,
                wrong: session.total_wrong
            });

            // Update best score if this is better
            if (percentage > groupedTests[testId].bestPercentage) {
                groupedTests[testId].bestScore = parseFloat(session.calculated_score || 0);
                groupedTests[testId].bestPercentage = percentage;
            }

            // Set latest attempt (first one due to DESC order)
            if (!groupedTests[testId].latestAttempt) {
                groupedTests[testId].latestAttempt = {
                    sessionId: session.id,
                    completedAt: session.completed_at,
                    score: parseFloat(session.calculated_score || 0),
                    percentage: percentage,
                    totalQuestions: session.total_questions,
                    attempted: session.total_correct + session.total_wrong
                };
            }

            groupedTests[testId].totalAttempts++;
        });

        // Convert to array and sort
        let groupedArray = Object.values(groupedTests);

        // Sort by latest attempt date
        if (sort === 'date_asc') {
            groupedArray.sort((a, b) => new Date(a.latestAttempt.completedAt) - new Date(b.latestAttempt.completedAt));
        } else {
            groupedArray.sort((a, b) => new Date(b.latestAttempt.completedAt) - new Date(a.latestAttempt.completedAt));
        }

        // Paginate
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const total = groupedArray.length;
        const totalPages = Math.ceil(total / parseInt(limit));
        const paginatedTests = groupedArray.slice(offset, offset + parseInt(limit));

        // Format response
        const formattedHistory = paginatedTests.map(test => ({
            // Test identification
            testId: test.testId,
            testName: test.testName,
            testNameGujarati: test.testNameGujarati,
            testUuid: test.testUuid,
            // Full hierarchy information
            testSeriesName: test.testSeriesName,
            testSeriesNameGujarati: test.testSeriesNameGujarati,
            testSeriesUuid: test.testSeriesUuid,
            categoryName: test.categoryName,
            categoryNameGujarati: test.categoryNameGujarati,
            categoryUuid: test.categoryUuid,
            subCategoryName: test.subCategoryName,
            subCategoryUuid: test.subCategoryUuid,
            hierarchyPath: test.hierarchyPath,
            // Access information
            isFreeInPaidSeries: test.isFreeInPaidSeries,
            pricingType: test.pricingType,
            // Latest attempt info
            latestSessionId: test.latestAttempt.sessionId,
            completedAt: test.latestAttempt.completedAt,
            latestScore: test.latestAttempt.score,
            latestPercentage: test.latestAttempt.percentage,
            // Best score info
            bestScore: test.bestScore,
            bestPercentage: test.bestPercentage,
            // Attempt count
            totalAttempts: test.totalAttempts,
            // Additional info
            totalQuestions: test.latestAttempt.totalQuestions,
            attempted: test.latestAttempt.attempted,
            // Timing (calculated on detail page)
            timeTaken: '0:00'
        }));

        res.json({
            success: true,
            message: 'Test history retrieved successfully (grouped by test)',
            data: {
                history: formattedHistory,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: totalPages,
                    total: total
                },
                note: 'Each entry represents a unique test. Use totalAttempts to see how many times the user took each test.'
            }
        });

    } catch (error) {
        console.error('Test history list error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve test history',
            error: error.message
        });
    }
});

/**
 * Get all attempts for a specific test
 * GET /api/test-history/test/:testId/attempts
 * Returns all attempts the user made on this specific test
 */
router.get('/test/:testId/attempts', requireAuth, async (req, res) => {
    try {
        const userId = req.user.uuid;
        const { testId } = req.params;

        console.log(`📊 Fetching all attempts for test ${testId} by user: ${userId}`);

        // Get all sessions for this specific test
        const sessions = await TestSession.findAll({
            where: {
                user_id: userId,
                test_id: testId,
                status: 'completed',
                is_completed: true
            },
            attributes: [
                'id', 'completed_at', 'started_at',
                'calculated_score', 'total_questions',
                'total_correct', 'total_wrong', 'total_unanswered'
            ],
            include: [{
                model: Test,
                as: 'test',
                attributes: ['id', 'title', 'uuid']
            }],
            order: [['completed_at', 'DESC']]
        });

        if (sessions.length === 0) {
            return res.json({
                success: true,
                message: 'No attempts found for this test',
                data: {
                    testId: testId,
                    testName: 'Unknown Test',
                    attempts: []
                }
            });
        }

        // Format all attempts
        const attempts = sessions.map((session, index) => {
            const timeSpentSeconds = session.started_at && session.completed_at
                ? Math.floor((new Date(session.completed_at) - new Date(session.started_at)) / 1000)
                : 0;

            const minutes = Math.floor(timeSpentSeconds / 60);
            const seconds = timeSpentSeconds % 60;

            const attempted = session.total_correct + session.total_wrong;
            const percentage = session.total_questions > 0
                ? Math.round((session.calculated_score / session.total_questions) * 100)
                : 0;

            return {
                attemptNumber: sessions.length - index, // Most recent = highest number
                sessionId: session.id,
                completedAt: session.completed_at,
                score: parseFloat(session.calculated_score || 0),
                percentage: percentage,
                totalQuestions: session.total_questions,
                attempted: attempted,
                correct: session.total_correct,
                wrong: session.total_wrong,
                unanswered: session.total_unanswered,
                timeTaken: `${minutes}:${seconds.toString().padStart(2, '0')}`
            };
        });

        res.json({
            success: true,
            message: 'All attempts retrieved successfully',
            data: {
                testId: testId,
                testName: sessions[0].test?.title || 'Quiz Test',
                testUuid: sessions[0].test?.uuid,
                totalAttempts: attempts.length,
                attempts: attempts
            }
        });

    } catch (error) {
        console.error('Get test attempts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve test attempts',
            error: error.message
        });
    }
});

/**
 * Get detailed test result for a specific session
 * GET /api/test-history/:sessionId
 * Requires authentication - user ID extracted from JWT token
 */
router.get('/:sessionId', requireAuth, async (req, res) => {
    try {
        const userId = req.user.uuid;
        const { sessionId } = req.params;

        console.log(`📊 Fetching detailed result for session: ${sessionId}`);

        // Fetch session with all details - must belong to authenticated user
        const session = await TestSession.findOne({
            where: {
                id: sessionId,
                user_id: userId
            },
            include: [{
                model: Test,
                as: 'test',
                attributes: ['id', 'title', 'uuid']
            }]
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Test session not found or access denied'
            });
        }

        // Calculate time spent
        let timeSpentSeconds = 0;
        if (session.started_at && session.completed_at) {
            timeSpentSeconds = Math.floor((new Date(session.completed_at) - new Date(session.started_at)) / 1000);
        }

        // Calculate attempted questions
        const attempted = session.total_correct + session.total_wrong;

        // Calculate percentage
        const percentage = session.total_questions > 0
            ? Math.round((session.calculated_score / session.total_questions) * 100)
            : 0;

        // Return detailed result
        res.json({
            success: true,
            message: 'Test result retrieved successfully',
            data: {
                sessionId: session.id,
                testId: session.test_id,
                testName: session.test?.title || 'Quiz Test',
                testUuid: session.test?.uuid,
                categoryName: 'General', // Default value
                completedAt: session.completed_at,
                totalQuestions: session.total_questions || 0,
                attempted: attempted,
                correct: session.total_correct || 0,
                wrong: session.total_wrong || 0,
                notAttempted: session.total_unanswered || 0,
                markedForReview: session.total_marked_for_review || 0,
                totalMarks: session.total_questions || 0, // Assuming 1 mark per question
                obtainedMarks: session.calculated_score || 0,
                negativeMarks: 0, // Default value
                finalScore: parseFloat(session.calculated_score || 0),
                percentage: percentage,
                accuracy: percentage, // Using percentage as accuracy for now
                timeSpent: timeSpentSeconds
            }
        });

    } catch (error) {
        console.error('Test result detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve test result',
            error: error.message
        });
    }
});

/**
 * Get test solutions (questions with answers)
 * GET /api/test-history/:sessionId/solutions
 * Requires authentication - user ID extracted from JWT token
 */
router.get('/:sessionId/solutions', requireAuth, async (req, res) => {
    try {
        const userId = req.user.uuid;
        const { sessionId } = req.params;

        console.log(`🔍 Fetching solutions for session: ${sessionId}`);

        // Fetch session - must belong to authenticated user
        const session = await TestSession.findOne({
            where: {
                id: sessionId,
                user_id: userId
            },
            include: [{
                model: Test,
                as: 'test',
                attributes: ['id', 'title']
            }]
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Test session not found or access denied'
            });
        }

        // Fetch user answers for this session
        const userAnswers = await UserAnswer.findAll({
            where: {
                test_session_id: sessionId
            },
            include: [{
                model: Question,
                as: 'question',
                attributes: [
                    'id', 'question_text', 'question_text_gujarati',
                    'option_a', 'option_a_gujarati',
                    'option_b', 'option_b_gujarati',
                    'option_c', 'option_c_gujarati',
                    'option_d', 'option_d_gujarati',
                    'correct_answer', 'explanation', 'explanation_gujarati',
                    'marks'
                ]
            }],
            order: [['created_at', 'ASC']]
        });

        // Format solutions
        const solutions = userAnswers.map(userAnswer => {
            const question = userAnswer.question;
            if (!question) return null;

            return {
                questionId: question.id,
                questionText: question.question_text,
                questionTextGujarati: question.question_text_gujarati,
                options: [
                    { label: 'A', text: question.option_a, gujarati: question.option_a_gujarati },
                    { label: 'B', text: question.option_b, gujarati: question.option_b_gujarati },
                    { label: 'C', text: question.option_c, gujarati: question.option_c_gujarati },
                    { label: 'D', text: question.option_d, gujarati: question.option_d_gujarati }
                ],
                correctAnswer: question.correct_answer,
                userAnswer: userAnswer.selected_option,
                isCorrect: userAnswer.is_correct,
                explanation: question.explanation,
                explanationGujarati: question.explanation_gujarati,
                marks: parseFloat(question.marks || 1),
                negativeMarks: 0, // Default value
                timeSpent: 0 // Default value
            };
        }).filter(q => q !== null);

        res.json({
            success: true,
            message: 'Test solutions retrieved successfully',
            data: {
                testName: session.test?.title || 'Quiz Test',
                totalQuestions: solutions.length,
                solutions: solutions
            }
        });

    } catch (error) {
        console.error('Test solutions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve test solutions',
            error: error.message
        });
    }
});

module.exports = router;
