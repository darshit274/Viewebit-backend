const ErrorHandler = require('../utils/default/errorHandler');
const { 
    FreeTest, NewTestSeries, NewQuestion, User, User_Answers, User_Score,
    Subject, SubjectHierarchy, Subscription
} = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// Start a new quiz session
exports.startQuiz = async (req, res, next) => {
    try {
        const { test_id, test_type, series_id, language = 'English' } = req.body;
        const userId = req.user?.uuid || 'mock-user-id';

        console.log('🎯 Starting quiz session:', { test_id, test_type, series_id, language });

        // Mock quiz session with sample questions
        const sessionId = uuidv4();
        
        const mockQuestions = [
            {
                id: 'q1',
                uuid: 'q1-uuid',
                question_text: 'What is the capital of India?',
                question_text_gujarati: 'ભારતની રાજધાની કઈ છે?',
                option_a: 'Mumbai',
                option_a_gujarati: 'મુંબઈ',
                option_b: 'New Delhi',
                option_b_gujarati: 'નવી દિલ્હી',
                option_c: 'Kolkata',
                option_c_gujarati: 'કોલકાતા',
                option_d: 'Chennai',
                option_d_gujarati: 'ચેન્નઈ',
                correct_answer: 'B',
                marks: 4,
                negative_marks: 1,
                subject: 'General Knowledge',
                topic: 'Geography',
                difficulty: 'easy',
                time_limit: 60,
                order_index: 1,
                explanation: 'New Delhi is the capital of India.'
            },
            {
                id: 'q2',
                uuid: 'q2-uuid',
                question_text: 'What is 15 + 25?',
                question_text_gujarati: '15 + 25 કેટલું થાય?',
                option_a: '35',
                option_a_gujarati: '35',
                option_b: '40',
                option_b_gujarati: '40',
                option_c: '45',
                option_c_gujarati: '45',
                option_d: '50',
                option_d_gujarati: '50',
                correct_answer: 'B',
                marks: 4,
                negative_marks: 1,
                subject: 'Mathematics',
                topic: 'Basic Arithmetic',
                difficulty: 'easy',
                time_limit: 60,
                order_index: 2,
                explanation: '15 + 25 = 40'
            },
            {
                id: 'q3',
                uuid: 'q3-uuid',
                question_text: 'Who wrote "Romeo and Juliet"?',
                question_text_gujarati: '"રોમિયો અને જુલિયટ" કોણે લખ્યું?',
                option_a: 'Charles Dickens',
                option_a_gujarati: 'ચાર્લ્સ ડિકન્સ',
                option_b: 'William Shakespeare',
                option_b_gujarati: 'વિલિયમ શેક્સપિયર',
                option_c: 'Jane Austen',
                option_c_gujarati: 'જેન ઓસ્ટિન',
                option_d: 'Mark Twain',
                option_d_gujarati: 'માર્ક ટ્વેઇન',
                correct_answer: 'B',
                marks: 4,
                negative_marks: 1,
                subject: 'English',
                topic: 'Literature',
                difficulty: 'medium',
                time_limit: 90,
                order_index: 3,
                explanation: 'William Shakespeare wrote the famous play "Romeo and Juliet".'
            }
        ];

        const mockSession = {
            id: sessionId,
            uuid: sessionId,
            test_type: test_type,
            test_id: test_id,
            series_id: series_id,
            user_id: userId,
            duration: 90, // minutes
            total_questions: mockQuestions.length,
            started_at: new Date(),
            expires_at: new Date(Date.now() + 90 * 60 * 1000), // 90 minutes from now
            is_paused: false,
            time_remaining: 90 * 60, // seconds
            language: language,
            allows_pause_resume: true,
            status: 'active'
        };

        const testInfo = {
            title: 'Sample Quiz Test',
            description: 'A comprehensive test covering multiple subjects',
            instructions: 'Read all questions carefully. Each correct answer gives 4 marks. Wrong answers deduct 1 mark.',
            total_marks: mockQuestions.reduce((sum, q) => sum + q.marks, 0),
            pass_percentage: 40,
            attempt_number: 1,
            max_attempts: 3,
            duration: 90,
            total_questions: mockQuestions.length,
            negative_marking: true
        };

        res.status(200).json({
            success: true,
            data: {
                session: mockSession,
                questions: mockQuestions,
                test_info: testInfo
            },
            message: 'Quiz session started successfully'
        });
    } catch (err) {
        console.error('Start quiz error:', err);
        const error = new ErrorHandler('Failed to start quiz', 500);
        return next(error);
    }
};

// Get current session status (for resuming)
exports.getSessionStatus = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user?.uuid || 'mock-user-id';

        // Mock session data - in real implementation, you'd fetch from database
        const session = {
            id: sessionId,
            user_id: userId,
            test_id: 'mock-test-id',
            test_type: 'free',
            series_id: null,
            language: 'English',
            total_questions: 10,
            duration: 60,
            marks_per_question: 1,
            negative_marks: 0,
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            status: 'active',
            can_pause: true,
            allow_review: true,
            shuffle_questions: false,
            shuffle_options: false
        };

        const savedAnswers = [];
        const statistics = {
            answered: 0,
            unanswered: 10,
            flagged: 0,
            time_elapsed: 0
        };

        res.status(200).json({
            success: true,
            data: {
                session: session,
                saved_answers: savedAnswers,
                statistics: statistics
            }
        });

    } catch (err) {
        console.error('Get session status error:', err);
        const error = new ErrorHandler('Failed to get session status', 500);
        return next(error);
    }
};

// Pause or resume quiz session
exports.pauseResumeQuiz = async (req, res, next) => {
    try {
        const { session_id, action, timestamp } = req.body;
        const userId = req.user?.uuid || 'mock-user-id';

        // Mock pause/resume logic
        const status = action === 'pause' ? 'paused' : 'active';
        const timeRemaining = 3000; // Mock remaining time in seconds

        res.status(200).json({
            success: true,
            data: {
                status: status,
                time_remaining: timeRemaining,
                paused_at: action === 'pause' ? timestamp : null,
                resumed_at: action === 'resume' ? timestamp : null
            }
        });

    } catch (err) {
        console.error('Pause/resume quiz error:', err);
        const error = new ErrorHandler('Failed to pause/resume quiz', 500);
        return next(error);
    }
};

// Save individual answer (auto-save functionality)
exports.saveAnswer = async (req, res, next) => {
    try {
        const {
            session_id,
            question_id,
            selected_option,
            time_spent,
            is_flagged = false,
            is_auto_save = false
        } = req.body;

        const userId = req.user?.uuid || 'mock-user-id';

        // In a real implementation, you'd want to validate the session
        // For now, we'll just simulate saving the answer

        res.status(200).json({
            success: true,
            data: {
                saved: true,
                time_remaining: 3600 // Mock remaining time
            }
        });

    } catch (err) {
        console.error('Save answer error:', err);
        const error = new ErrorHandler('Failed to save answer', 500);
        return next(error);
    }
};

// Submit quiz and get results
exports.submitQuiz = async (req, res, next) => {
    try {
        const {
            session_id,
            answers,
            submitted_at,
            time_taken,
            is_manual_submit
        } = req.body;

        const userId = req.user?.uuid || 'mock-user-id';

        // Calculate results
        let totalScore = 0;
        let correctAnswers = 0;
        let wrongAnswers = 0;
        let unanswered = 0;

        const detailedResults = [];

        for (const answer of answers) {
            if (answer.selected_option === null) {
                unanswered++;
                detailedResults.push({
                    question_id: answer.question_id,
                    selected_option: null,
                    correct_option: 'A', // Mock
                    is_correct: false,
                    marks_obtained: 0,
                    time_spent: answer.time_spent
                });
            } else {
                // Mock calculation - in real app, you'd compare with correct answer
                const isCorrect = Math.random() > 0.5; // Mock 50% chance
                if (isCorrect) {
                    correctAnswers++;
                    totalScore += 1; // Mock marks
                } else {
                    wrongAnswers++;
                    totalScore -= 0.25; // Mock negative marking
                }

                detailedResults.push({
                    question_id: answer.question_id,
                    selected_option: answer.selected_option,
                    correct_option: 'A', // Mock
                    is_correct: isCorrect,
                    marks_obtained: isCorrect ? 1 : -0.25,
                    time_spent: answer.time_spent
                });
            }
        }

        const totalQuestions = answers.length;
        const percentage = Math.max(0, (totalScore / totalQuestions) * 100);
        const passed = percentage >= 40;

        const result = {
            result_id: uuidv4(),
            session_id: session_id,
            total_score: Math.max(0, totalScore),
            correct_answers: correctAnswers,
            wrong_answers: wrongAnswers,
            unanswered: unanswered,
            percentage: Math.round(percentage * 100) / 100,
            grade: passed ? 'Pass' : 'Fail',
            passed: passed,
            time_taken: time_taken,
            rank: Math.floor(Math.random() * 100) + 1, // Mock rank
            total_participants: Math.floor(Math.random() * 1000) + 100, // Mock
            detailed_results: detailedResults
        };

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (err) {
        console.error('Submit quiz error:', err);
        const error = new ErrorHandler('Failed to submit quiz', 500);
        return next(error);
    }
};

// Validate quiz session before starting
exports.validateQuizSession = async (req, res, next) => {
    try {
        const { test_id, test_type, series_id } = req.query;
        const userId = req.user?.uuid;

        let canStart = true;
        let reason = '';
        let attemptsUsed = 0;
        let maxAttempts = 3;

        // Mock validation logic
        if (test_type === 'series' && series_id) {
            // Check if user has purchased the series
            const subscription = await Subscription.findOne({
                where: {
                    user_id: userId,
                    test_series_id: series_id,
                    status: 'completed'
                }
            });

            if (!subscription) {
                canStart = false;
                reason = 'Please purchase this test series to access';
            }
        }

        res.status(200).json({
            success: true,
            data: {
                can_start: canStart,
                reason: reason,
                attempts_used: attemptsUsed,
                max_attempts: maxAttempts,
                time_until_next_attempt: null,
                existing_session: null
            }
        });

    } catch (err) {
        console.error('Validate quiz session error:', err);
        const error = new ErrorHandler('Failed to validate session', 500);
        return next(error);
    }
};

// Get quiz history
exports.getQuizHistory = async (req, res, next) => {
    try {
        const userId = req.user?.uuid || 'mock-user-id';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const test_type = req.query.test_type;

        // Mock history data
        const history = [];

        res.status(200).json({
            success: true,
            data: history,
            pagination: {
                total: 0,
                page: page,
                limit: limit,
                totalPages: 0
            }
        });

    } catch (err) {
        console.error('Get quiz history error:', err);
        const error = new ErrorHandler('Failed to fetch quiz history', 500);
        return next(error);
    }
};

// Get quiz leaderboard
exports.getQuizLeaderboard = async (req, res, next) => {
    try {
        const { test_id, test_type } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        // Mock leaderboard data
        const leaderboard = [];

        res.status(200).json({
            success: true,
            data: leaderboard
        });

    } catch (err) {
        console.error('Get quiz leaderboard error:', err);
        const error = new ErrorHandler('Failed to fetch leaderboard', 500);
        return next(error);
    }
};

// Review answers after quiz completion
exports.reviewAnswers = async (req, res, next) => {
    try {
        const { sessionId, resultId } = req.params;
        const userId = req.user?.uuid || 'mock-user-id';

        // Mock questions with results for review
        const questions = [
            {
                id: 'q1',
                question_text: 'What is the capital of India?',
                options: {
                    A: 'Mumbai',
                    B: 'New Delhi',
                    C: 'Kolkata',
                    D: 'Chennai'
                },
                selected_option: 'B',
                correct_option: 'B',
                is_correct: true,
                marks_obtained: 1,
                time_spent: 30,
                subject: 'General Knowledge',
                topic: 'Geography',
                difficulty: 'easy',
                language: 'English',
                explanation: 'New Delhi is the capital of India and serves as the seat of the Government of India.'
            },
            {
                id: 'q2',
                question_text: 'Which planet is largest in our solar system?',
                options: {
                    A: 'Earth',
                    B: 'Mars',
                    C: 'Jupiter',
                    D: 'Saturn'
                },
                selected_option: 'A',
                correct_option: 'C',
                is_correct: false,
                marks_obtained: -0.25,
                time_spent: 45,
                subject: 'Science',
                topic: 'Astronomy',
                difficulty: 'medium',
                language: 'English',
                explanation: 'Jupiter is the largest planet in our solar system, with a mass greater than all other planets combined.'
            }
        ];

        const resultSummary = {
            total_score: 0.75,
            percentage: 37.5,
            grade: 'Fail',
            passed: false,
            rank: 45
        };

        res.status(200).json({
            success: true,
            data: {
                questions: questions,
                result_summary: resultSummary
            }
        });

    } catch (err) {
        console.error('Review answers error:', err);
        const error = new ErrorHandler('Failed to get review answers', 500);
        return next(error);
    }
};