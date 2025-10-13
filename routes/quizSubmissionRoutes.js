const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { LeaderboardEntry, TestSeries, User, Test, TestSession, SubCategory, Category, Question, sequelize } = require('../models');

/**
 * Simple quiz submission endpoint for frontend
 */
router.post('/submit', async (req, res) => {
    try {
        const {
            userId,
            testSeriesId, // This is actually the UUID from the frontend URL
            answers = [],
            totalTimeSpent = 120,
            markedForReviewCount = 0,
            totalQuestions: frontendTotalQuestions // Get actual total questions from frontend
        } = req.body;

        console.log('Quiz submission received:', {
            userId,
            testSeriesId,
            answersCount: answers.length,
            totalTimeSpent,
            markedForReviewCount,
            frontendTotalQuestions
        });

        // Calculate score from answers
        // IMPORTANT: totalQuestions should be the ACTUAL total, not just answered questions
        const totalQuestions = frontendTotalQuestions || answers.length;
        const answeredQuestions = answers.length;
        const correctAnswers = answers.filter(answer => answer.isCorrect).length;
        // wrongAnswers = answered questions that are INCORRECT (not including unanswered)
        const wrongAnswers = answeredQuestions - correctAnswers;
        const unansweredQuestions = totalQuestions - answeredQuestions;

        console.log('🧮 QUIZ SCORE CALCULATION:', {
            totalQuestions,
            answeredQuestions,
            correctAnswers,
            wrongAnswers,
            unansweredQuestions
        });

        // Find or create user
        let user = await User.findOne({ where: { uuid: userId } });
        if (!user) {
            // Create a temporary user for this submission
            const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);
            user = await User.create({
                uuid: userId,
                username: `QuizUser_${uniqueId}`,
                email: `quiz-${uniqueId}@test.com`,
                password: 'temp-password',
                isEmailVerified: true,
                role: 'student'
            });
            console.log(`Created user for quiz submission: ${user.uuid}`);
        }

        // Find or create test series
        let testSeries = await TestSeries.findOne({ where: { uuid: testSeriesId } });

        console.log('🔍 TEST SERIES DATABASE VALUES:', {
            uuid: testSeries?.uuid,
            has_negative_marking: testSeries?.has_negative_marking,
            negative_marks: testSeries?.negative_marks,
            negativeMarksType: typeof testSeries?.negative_marks
        });

        if (!testSeries) {
            testSeries = await TestSeries.create({
                uuid: testSeriesId,
                name: `Quiz Series - ${testSeriesId.slice(0, 8)}`,
                name_gujarati: 'ક્વિઝ શ્રેણી',
                description: 'Quiz series created from frontend submission',
                description_gujarati: 'ફ્રન્ટએન્ડ સબમિશનથી બનાવેલ ક્વિઝ શ્રેણી',
                price: 0.00,
                pricing_type: 'free',
                difficulty_level: 'beginner',
                is_active: 1,
                is_published: 1,
                published_at: new Date(),
                has_negative_marking: false,  // Default to disabled
                negative_marks: 0.25         // Default value
            });
            console.log(`Created test series: ${testSeries.uuid}`);
        }

        // Calculate score with actual marks per question
        let obtainedMarks = 0;
        let totalMarks = 0;

        // Calculate obtained marks and total marks from question data
        for (const answer of answers) {
            if (answer.questionId) {
                const question = await Question.findByPk(answer.questionId, {
                    attributes: ['id', 'marks']
                });

                if (question) {
                    const questionMarks = question.marks || 1; // Default to 1 if not set
                    totalMarks += questionMarks;

                    if (answer.isCorrect) {
                        obtainedMarks += questionMarks;
                    }
                }
            }
        }

        // Fallback if no questions found (shouldn't happen)
        if (totalMarks === 0) {
            obtainedMarks = correctAnswers; // 1 mark per correct answer as fallback
            totalMarks = totalQuestions; // 1 mark per question as fallback
        }

        let negativeMarks = 0;
        let finalScore = obtainedMarks;
        let percentage = totalMarks > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

        // NEW: Apply category-level negative marking logic
        if (wrongAnswers > 0) {
            // Group wrong answers by category to apply different negative marking rules
            const wrongAnswersByCategory = {};

            for (const answer of answers) {
                if (!answer.isCorrect && answer.questionId) {
                    // Get the question and its category
                    const question = await Question.findByPk(answer.questionId, {
                        include: [{
                            model: Category,
                            as: 'category',
                            attributes: ['id', 'negative_marking_enabled', 'negative_marks_per_wrong']
                        }]
                    });

                    if (question && question.category) {
                        const categoryId = question.category.id;
                        if (!wrongAnswersByCategory[categoryId]) {
                            wrongAnswersByCategory[categoryId] = {
                                count: 0,
                                negative_marking_enabled: question.category.negative_marking_enabled,
                                negative_marks_per_wrong: question.category.negative_marks_per_wrong || 0.25
                            };
                        }
                        wrongAnswersByCategory[categoryId].count++;
                    }
                }
            }

            // Calculate negative marks per category
            let totalNegativeMarks = 0;
            const categoryNegativeMarks = {};

            for (const [categoryId, categoryData] of Object.entries(wrongAnswersByCategory)) {
                if (categoryData.negative_marking_enabled) {
                    const categoryNegativeMarksValue = categoryData.count * categoryData.negative_marks_per_wrong;
                    categoryNegativeMarks[categoryId] = categoryNegativeMarksValue;
                    totalNegativeMarks += categoryNegativeMarksValue;
                }
            }

            negativeMarks = totalNegativeMarks;
            finalScore = Math.max(0, obtainedMarks - negativeMarks);
            percentage = totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0;

            console.log('✅ CATEGORY-LEVEL NEGATIVE MARKING APPLIED:', {
                obtainedMarks,
                wrongAnswersByCategory,
                categoryNegativeMarks,
                totalNegativeMarks: negativeMarks,
                finalScore,
                percentage: percentage + '%'
            });
        } else {
            console.log('❌ NO WRONG ANSWERS - NO NEGATIVE MARKING NEEDED:', {
                obtainedMarks,
                finalScore,
                percentage: percentage + '%'
            });
        }

        const score = finalScore;

        // Calculate attempted marks for accuracy calculation
        let attemptedMarks = 0;
        for (const answer of answers) {
            if (answer.questionId) {
                const question = await Question.findByPk(answer.questionId, {
                    attributes: ['id', 'marks']
                });
                if (question) {
                    attemptedMarks += question.marks || 1;
                }
            }
        }

        // Calculate accuracy: (obtained marks / attempted marks) × 100
        const accuracy = attemptedMarks > 0 ? Math.round((finalScore / attemptedMarks) * 100) : 0;

        // ALWAYS create a NEW category for this specific test series to ensure isolation
        const category = await Category.create({
            name: `Quiz Category - ${testSeriesId.slice(0, 8)}`,
            description: `Category for test series ${testSeriesId}`,
            test_series_id: testSeries.id,
            exam_type: 'quiz',
            is_active: true
        });

        // ALWAYS create a NEW subcategory for this specific category to ensure isolation
        const subCategory = await SubCategory.create({
            category_id: category.id,
            name: `Quiz SubCategory - ${testSeriesId.slice(0, 8)}`,
            description: `SubCategory for test series ${testSeriesId}`,
            is_active: true
        });

        // Create a simple test record (required for LeaderboardEntry)
        const test = await Test.create({
            uuid: uuidv4(), // Use proper UUID format
            title: `Quiz Test - ${new Date().toLocaleDateString()}`,
            subtitle: 'Frontend quiz submission',
            instructions: 'Quiz taken through frontend',
            duration_minutes: Math.ceil(totalTimeSpent / 60),
            total_questions: totalQuestions,
            passing_marks: Math.ceil(totalQuestions * 0.6), // 60% passing
            negative_marking_enabled: negativeMarks > 0, // True if any category had negative marking applied
            negative_marks_per_wrong: 0, // Set to 0 since it now varies by category
            is_active: true,
            sub_category_id: subCategory.id
        });

        // Create a test session with test history fields
        const testSession = await TestSession.create({
            id: uuidv4(),
            user_id: userId,
            test_id: test.id,
            status: 'completed',
            started_at: new Date(Date.now() - totalTimeSpent * 1000),
            completed_at: new Date(),
            is_completed: true,
            is_submitted: true,
            calculated_score: score,
            total_correct: correctAnswers,
            total_wrong: wrongAnswers,
            total_unanswered: unansweredQuestions,
            total_marked_for_review: markedForReviewCount,
            total_questions: totalQuestions,
            time_spent_seconds: totalTimeSpent,
            final_score: score,
            percentage: percentage,
            // Test history fields
            test_name: test.title,
            category_name: category.name,
            total_marks: totalMarks,
            obtained_marks: obtainedMarks,
            negative_marks: negativeMarks,
            attempted_questions: answeredQuestions,
            accuracy: accuracy,
            // IMPORTANT: Store the actual DynamicCategory UUID for test history grouping
            session_data: {
                category_uuid: testSeriesId, // This is the DynamicCategory UUID from frontend
                submission_source: 'dynamic_category_quiz'
            }
        });

        // Create leaderboard entry directly
        const leaderboardEntry = await LeaderboardEntry.create({
            user_id: userId,
            test_id: test.id, // Use the created test ID
            test_session_id: testSession.id,
            test_series_id: null, // Set to null to avoid foreign key issues for now
            category_id: null,
            score: score,
            percentage: percentage,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            wrong_answers: wrongAnswers,
            unanswered: unansweredQuestions,
            time_taken_seconds: totalTimeSpent,
            rank: 1, // Will be recalculated
            percentile: 100, // Will be recalculated
            completion_date: new Date(),
            is_valid: true
        });

        console.log(`Created leaderboard entry: ${leaderboardEntry.id}`);

        res.json({
            success: true,
            message: 'Quiz submitted successfully!',
            data: {
                leaderboardEntryId: leaderboardEntry.id,
                score: score,
                totalQuestions: totalQuestions,
                answeredQuestions: answeredQuestions,
                correctAnswers: correctAnswers,
                wrongAnswers: wrongAnswers,
                unansweredQuestions: unansweredQuestions,
                percentage: percentage,
                // Alternative field names in case frontend uses different keys
                finalPercentage: percentage,
                calculatedPercentage: percentage,
                actualPercentage: percentage,
                // Mark calculation info (updated for variable marks per question)
                totalMarks: totalMarks,
                obtainedMarks: obtainedMarks,
                negativeMarkingEnabled: negativeMarks > 0, // True if any category had negative marking
                negativeMarksDeducted: negativeMarks,
                negativeMarkValue: 0, // Set to 0 since it now varies by category
                finalScore: finalScore,
                completionTime: new Date().toISOString(),
                timestamp: Date.now(), // Cache buster
                // Override any frontend calculation
                displayPercentage: percentage,
                resultPercentage: percentage,
                scorePercentage: percentage,
                debug: {
                    totalMarks,
                    obtainedMarks,
                    negativeMarks,
                    finalScore,
                    percentageCalculation: `(${finalScore}/${totalQuestions}) * 100 = ${percentage}%`,
                    correctAnswersOnly: `(${correctAnswers}/${totalQuestions}) * 100 = ${Math.round((correctAnswers/totalQuestions)*100)}%`,
                    marksCalculation: `Total Marks: ${totalMarks}, Obtained: ${obtainedMarks}, After Negative: ${finalScore}`,
                    warning: "Frontend should use 'percentage' field, not calculate (correctAnswers/totalQuestions)*100"
                }
            }
        });

    } catch (error) {
        console.error('Quiz submission error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to submit quiz',
            error: error.message,
            details: error.errors ? error.errors.map(e => e.message) : []
        });
    }
});

/**
 * Clear contaminated data for a test series
 */
router.delete('/clear-series/:testSeriesId', async (req, res) => {
    try {
        const { testSeriesId } = req.params;

        console.log(`Clearing all data for test series: ${testSeriesId}`);

        // Find test series
        const testSeries = await TestSeries.findOne({ where: { uuid: testSeriesId } });
        if (!testSeries) {
            return res.json({ success: false, message: 'Test series not found' });
        }

        // Find all related tests and categories
        const categories = await Category.findAll({ where: { test_series_id: testSeries.id } });
        const categoryIds = categories.map(c => c.id);

        const subCategories = await SubCategory.findAll({ where: { category_id: categoryIds } });
        const subCategoryIds = subCategories.map(sc => sc.id);

        const tests = await Test.findAll({ where: { sub_category_id: subCategoryIds } });
        const testIds = tests.map(t => t.id);

        // Delete all related data
        const deletedLeaderboard = await LeaderboardEntry.destroy({ where: { test_id: testIds } });
        const deletedSessions = await TestSession.destroy({ where: { test_id: testIds } });
        const deletedTests = await Test.destroy({ where: { id: testIds } });
        const deletedSubCategories = await SubCategory.destroy({ where: { id: subCategoryIds } });
        const deletedCategories = await Category.destroy({ where: { id: categoryIds } });
        const deletedTestSeries = await TestSeries.destroy({ where: { id: testSeries.id } });

        console.log(`Deleted: ${deletedLeaderboard} leaderboard entries, ${deletedSessions} sessions, ${deletedTests} tests`);

        res.json({
            success: true,
            message: 'Test series data cleared successfully',
            deleted: {
                leaderboardEntries: deletedLeaderboard,
                testSessions: deletedSessions,
                tests: deletedTests,
                subCategories: deletedSubCategories,
                categories: deletedCategories,
                testSeries: deletedTestSeries
            }
        });

    } catch (error) {
        console.error('Error clearing test series:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get latest quiz result for a user and test series
 */
router.get('/latest-result/:userId/:testSeriesId', async (req, res) => {
    try {
        const { userId, testSeriesId } = req.params;

        console.log(`🔍 Getting latest result for user ${userId} in test series ${testSeriesId}`);

        // Find the latest leaderboard entry for this user and test series
        const latestEntry = await LeaderboardEntry.findOne({
            where: {
                user_id: userId,
                test_series_id: testSeriesId
            },
            order: [['completion_date', 'DESC']],
            include: [{
                model: TestSeries,
                as: 'testSeries',
                attributes: ['name', 'has_negative_marking', 'negative_marks']
            }]
        });

        if (!latestEntry) {
            return res.status(404).json({
                success: false,
                message: 'No quiz results found for this user and test series'
            });
        }

        console.log(`✅ Found latest result: ${latestEntry.percentage}% (entry ID: ${latestEntry.id})`);

        res.json({
            success: true,
            message: 'Latest quiz result retrieved successfully',
            data: {
                leaderboardEntryId: latestEntry.id,
                score: parseFloat(latestEntry.score),
                totalQuestions: latestEntry.total_questions,
                correctAnswers: latestEntry.correct_answers,
                wrongAnswers: latestEntry.wrong_answers,
                percentage: latestEntry.percentage,
                completionTime: latestEntry.completion_date,
                negativeMarkingEnabled: latestEntry.testSeries?.has_negative_marking || false,
                timestamp: Date.now()
            }
        });

    } catch (error) {
        console.error('Get latest result error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve latest quiz result',
            error: error.message
        });
    }
});

/**
 * Nuclear option - clear ALL old contaminated leaderboard data
 */
router.post('/nuclear-clean', async (req, res) => {
    try {
        console.log('NUCLEAR CLEAN: Clearing all old leaderboard data...');

        // Delete all leaderboard entries that are NOT from today's submissions
        const today = new Date();
        today.setHours(11, 0, 0, 0); // 11 AM today

        const deletedEntries = await LeaderboardEntry.destroy({
            where: {
                completion_date: {
                    [require('sequelize').Op.lt]: today
                }
            }
        });

        console.log(`NUCLEAR CLEAN: Deleted ${deletedEntries} old leaderboard entries`);

        res.json({
            success: true,
            message: `Nuclear clean completed - deleted ${deletedEntries} old entries`,
            deletedCount: deletedEntries
        });

    } catch (error) {
        console.error('Nuclear clean error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;