// Simplified test review endpoint for testing
const express = require('express');
const router = express.Router();
const { TestSession, Test, Question, UserAnswer, sequelize } = require('../../models');

router.get('/test-sessions/:sessionUuid/review', async (req, res) => {
  try {
    const { sessionUuid } = req.params;
    
    // Get session with test details
    const session = await TestSession.findOne({
      where: { id: sessionUuid },
      include: [{
        model: Test,
        as: 'test'
      }]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    // Get questions using raw query to avoid model issues
    const questions = await sequelize.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d, 
              correct_answer, marks, explanation 
       FROM questions 
       WHERE test_id = :testId AND is_active = true 
       ORDER BY id`,
      {
        replacements: { testId: session.test_id },
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Get user answers using raw query
    const userAnswers = await sequelize.query(
      `SELECT question_id, selected_option, is_correct, time_spent, is_flagged 
       FROM user_answers 
       WHERE test_session_id = :sessionId`,
      {
        replacements: { sessionId: session.id },
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Create answer map
    const answerMap = {};
    userAnswers.forEach(answer => {
      answerMap[answer.question_id] = answer;
    });

    // Format questions with answers
    const questionsWithAnswers = questions.map(question => {
      const userAnswer = answerMap[question.id];
      return {
        id: question.id,
        question_text: question.question_text,
        options: {
          A: question.option_a,
          B: question.option_b,
          C: question.option_c,
          D: question.option_d
        },
        correct_option: question.correct_answer,
        selected_option: userAnswer ? userAnswer.selected_option : null,
        is_correct: userAnswer ? userAnswer.is_correct : false,
        time_spent: userAnswer ? userAnswer.time_spent : 0,
        is_flagged: userAnswer ? userAnswer.is_flagged : false,
        explanation: question.explanation || 'No explanation available',
        marks: question.marks || 1
      };
    });

    // Calculate summary
    const totalQuestions = questions.length;
    const attemptedQuestions = questionsWithAnswers.filter(q => q.selected_option !== null).length;
    const correctAnswers = questionsWithAnswers.filter(q => q.is_correct).length;
    const incorrectAnswers = attemptedQuestions - correctAnswers;
    const unansweredQuestions = totalQuestions - attemptedQuestions;

    res.json({
      success: true,
      data: {
        session_id: session.id,
        test_title: session.test ? session.test.title : 'Test',
        questions: questionsWithAnswers,
        result_summary: {
          total_questions: totalQuestions,
          attempted: attemptedQuestions,
          correct: correctAnswers,
          incorrect: incorrectAnswers,
          unanswered: unansweredQuestions,
          total_score: correctAnswers,
          total_marks: totalQuestions,
          percentage: totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : 0,
          time_taken: 0,
          completed_at: session.completed_at
        }
      }
    });
  } catch (error) {
    console.error('Error in test review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test review',
      error: error.message
    });
  }
});

module.exports = router;