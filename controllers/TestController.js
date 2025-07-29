const {
  ExamCategory,
  TestSeries,
  Test,
  Question,
  TestSession,
  UserAnswer,
  UserSubscription,
  ExamType,
  User
} = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const testController = {

  // ============= HIERARCHICAL NAVIGATION =============

  /**
   * Get exam categories with hierarchical structure
   */
  async getExamCategories(req, res) {
    try {
      const { level, parent_id } = req.query;
      
      const whereConditions = { is_active: true };
      if (level !== undefined) whereConditions.hierarchy_level = parseInt(level);
      if (parent_id) whereConditions.parent_id = parent_id;
      
      const categories = await ExamCategory.findAll({
        where: whereConditions,
        include: [
          {
            model: ExamCategory,
            as: 'children',
            where: { is_active: true },
            required: false,
            include: [{
              model: TestSeries,
              as: 'testSeries',
              where: { is_active: true, is_published: true },
              required: false,
              attributes: ['id', 'uuid', 'title', 'title_gujarati', 'price', 'is_free', 'total_tests', 'thumbnail_url']
            }]
          },
          {
            model: TestSeries,
            as: 'testSeries',
            where: { is_active: true, is_published: true },
            required: false,
            attributes: ['id', 'uuid', 'title', 'title_gujarati', 'price', 'is_free', 'total_tests', 'thumbnail_url']
          }
        ],
        order: [['display_order', 'ASC'], ['name', 'ASC']]
      });

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching exam categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch exam categories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Get test series with filtering and search
   */
  async getTestSeries(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        search,
        category_id,
        exam_type_id,
        difficulty_level,
        price_min,
        price_max,
        is_free,
        is_featured,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const whereConditions = { 
        is_active: true, 
        is_published: true 
      };
      
      if (search) {
        whereConditions[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { title_gujarati: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (category_id) whereConditions.category_id = category_id;
      if (exam_type_id) whereConditions.exam_type_id = exam_type_id;
      if (difficulty_level) whereConditions.difficulty_level = difficulty_level;
      if (is_free !== undefined) whereConditions.is_free = is_free === 'true';
      if (is_featured !== undefined) whereConditions.is_featured = is_featured === 'true';
      
      if (price_min || price_max) {
        whereConditions.price = {};
        if (price_min) whereConditions.price[Op.gte] = parseFloat(price_min);
        if (price_max) whereConditions.price[Op.lte] = parseFloat(price_max);
      }

      const { count, rows } = await TestSeries.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: ExamCategory,
            as: 'category',
            attributes: ['id', 'name', 'name_gujarati', 'hierarchy_level']
          },
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Get additional statistics for each series
      const enhancedRows = await Promise.all(rows.map(async (series) => {
        const [testsCount, freeTestsCount] = await Promise.all([
          Test.count({
            where: { test_series_id: series.id, is_active: true }
          }),
          Test.count({
            where: { test_series_id: series.id, is_active: true, is_free: true }
          })
        ]);

        return {
          ...series.toJSON(),
          actualTestsCount: testsCount,
          actualFreeTestsCount: freeTestsCount
        };
      }));

      res.json({
        success: true,
        data: {
          testSeries: enhancedRows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test series',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Get single test series with complete details
   */
  async getTestSeriesById(req, res) {
    try {
      const { id } = req.params;
      const { user_id } = req.query;
      
      const testSeries = await TestSeries.findOne({
        where: { 
          [Op.or]: [
            { id: parseInt(id) },
            { uuid: id }
          ],
          is_active: true 
        },
        include: [
          {
            model: ExamCategory,
            as: 'category',
            attributes: ['id', 'name', 'name_gujarati', 'hierarchy_level']
          },
          {
            model: ExamType,
            as: 'examType',
            attributes: ['id', 'name', 'code']
          },
          {
            model: TestSeries,
            as: 'parentSeries',
            attributes: ['id', 'title', 'hierarchy_path']
          },
          {
            model: TestSeries,
            as: 'childSeries',
            where: { is_active: true, is_published: true },
            required: false,
            attributes: ['id', 'uuid', 'title', 'title_gujarati', 'price', 'is_free', 'total_tests']
          },
          {
            model: Test,
            as: 'tests',
            where: { is_active: true },
            required: false,
            attributes: [
              'id', 'uuid', 'title', 'title_gujarati', 'description', 'test_type', 
              'duration_minutes', 'total_questions', 'total_marks',
              'is_free', 'is_one_time', 'allows_pause', 'max_attempts',
              'has_negative_marking', 'display_order', 'available_from', 'available_until'
            ],
            order: [['display_order', 'ASC']]
          }
        ]
      });

      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: 'Test series not found'
        });
      }

      // Get user-specific data if user_id provided
      let userAccess = null;
      let userProgress = null;
      
      if (user_id) {
        // Check if user has access (subscription or free)
        const subscription = await UserSubscription.findOne({
          where: {
            user_id,
            test_series_id: testSeries.id,
            status: 'active'
          }
        });

        // Get user's test sessions and progress
        const sessions = await TestSession.findAll({
          where: {
            user_id,
            test_series_id: testSeries.id
          },
          include: [{
            model: Test,
            as: 'test',
            attributes: ['id', 'title', 'title_gujarati']
          }],
          order: [['created_at', 'DESC']]
        });

        userAccess = {
          hasAccess: subscription ? true : testSeries.is_free,
          subscriptionStatus: subscription?.status || null,
          subscriptionExpiry: subscription?.expires_at || null
        };

        userProgress = {
          totalAttempts: sessions.length,
          completedTests: sessions.filter(s => s.status === 'completed').length,
          inProgressTests: sessions.filter(s => ['in_progress', 'paused'].includes(s.status)).length,
          averageScore: sessions.length > 0 ? 
            sessions.reduce((sum, s) => sum + (s.percentage || 0), 0) / sessions.length : 0,
          recentSessions: sessions.slice(0, 5)
        };
      }

      res.json({
        success: true,
        data: {
          testSeries: testSeries.toJSON(),
          userAccess,
          userProgress
        }
      });
    } catch (error) {
      console.error('Error fetching test series:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test series details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ============= TEST SESSION MANAGEMENT =============

  /**
   * Start a new test session
   */
  async startTestSession(req, res) {
    try {
      const { testId } = req.params;
      const { user_id, language = 'en' } = req.body;
      
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Get test details
      const test = await Test.findOne({
        where: { 
          [Op.or]: [
            { id: parseInt(testId) },
            { uuid: testId }
          ],
          is_active: true 
        },
        include: [{
          model: TestSeries,
          as: 'testSeries',
          attributes: ['id', 'title', 'supports_pause_resume', 'max_attempts_per_test']
        }]
      });

      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      // Check if test is available
      const now = new Date();
      if (test.available_from && now < test.available_from) {
        return res.status(400).json({
          success: false,
          message: 'Test is not yet available'
        });
      }
      
      if (test.available_until && now > test.available_until) {
        return res.status(400).json({
          success: false,
          message: 'Test has expired'
        });
      }

      // Check user access to test series
      if (!test.is_free && !test.testSeries.is_free) {
        const subscription = await UserSubscription.findOne({
          where: {
            user_id,
            test_series_id: test.test_series_id,
            status: 'active'
          }
        });

        if (!subscription) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Subscription required.'
          });
        }
      }

      // Check user's previous attempts
      const previousAttempts = await TestSession.findAll({
        where: {
          user_id,
          test_id: test.id
        },
        order: [['created_at', 'DESC']]
      });

      // Check if user has an active session
      const activeSession = previousAttempts.find(session => 
        ['in_progress', 'paused'].includes(session.status)
      );

      if (activeSession) {
        // Get current questions for resume
        const questions = await Question.findAll({
          where: {
            test_id: test.id,
            is_active: true
          },
          order: [['display_order', 'ASC'], ['id', 'ASC']]
        });

        return res.json({
          success: true,
          message: 'Resuming existing session',
          data: {
            sessionId: activeSession.session_id,
            status: activeSession.status,
            currentQuestionIndex: activeSession.current_question_index,
            remainingTime: activeSession.remaining_time,
            questionsAnswered: activeSession.questions_answered,
            questions: questions.map(q => ({
              id: q.id,
              question: language === 'gu' && q.question_gujarati ? q.question_gujarati : q.question,
              options: language === 'gu' && q.options_gujarati ? q.options_gujarati : q.options,
              marks: q.marks,
              subject: q.subject,
              difficulty: q.difficulty,
              hasImage: !!q.image_url,
              hasAudio: !!q.audio_url
            }))
          }
        });
      }

      // Check attempt limits
      const completedAttempts = previousAttempts.filter(s => s.status === 'completed').length;
      const maxAttempts = test.max_attempts || test.testSeries.max_attempts_per_test;
      
      if (maxAttempts && completedAttempts >= maxAttempts) {
        return res.status(400).json({
          success: false,
          message: `Maximum attempts (${maxAttempts}) exceeded for this test`
        });
      }

      // Check one-time test restriction
      if (test.is_one_time && completedAttempts > 0) {
        return res.status(400).json({
          success: false,
          message: 'This is a one-time test and has already been completed'
        });
      }

      // Create new session
      const sessionId = uuidv4();
      const session = await TestSession.create({
        session_id: sessionId,
        user_id,
        test_id: test.id,
        test_series_id: test.test_series_id,
        attempt_number: completedAttempts + 1,
        status: 'in_progress',
        started_at: now,
        last_activity_at: now,
        remaining_time: test.duration_minutes * 60,
        selected_language: language,
        user_agent: req.headers['user-agent'],
        ip_address: req.ip
      });

      // Get test questions
      const questions = await Question.findAll({
        where: {
          test_id: test.id,
          is_active: true
        },
        order: [['display_order', 'ASC'], ['id', 'ASC']]
      });

      res.json({
        success: true,
        message: 'Test session started successfully',
        data: {
          sessionId: session.session_id,
          test: {
            id: test.id,
            title: language === 'gu' && test.title_gujarati ? test.title_gujarati : test.title,
            duration_minutes: test.duration_minutes,
            total_questions: test.total_questions,
            has_negative_marking: test.has_negative_marking,
            negative_marks: test.negative_marks,
            allows_pause: test.allows_pause,
            is_one_time: test.is_one_time,
            instructions: language === 'gu' && test.instructions_gujarati ? test.instructions_gujarati : test.instructions
          },
          session: {
            attemptNumber: session.attempt_number,
            remainingTime: session.remaining_time,
            startedAt: session.started_at
          },
          questions: questions.map(q => ({
            id: q.id,
            question: language === 'gu' && q.question_gujarati ? q.question_gujarati : q.question,
            options: language === 'gu' && q.options_gujarati ? q.options_gujarati : q.options,
            marks: q.marks,
            subject: q.subject,
            difficulty: q.difficulty,
            hasImage: !!q.image_url,
            hasAudio: !!q.audio_url
          }))
        }
      });
    } catch (error) {
      console.error('Error starting test session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start test session',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Submit answer for a question
   */
  async submitAnswer(req, res) {
    try {
      const { sessionId } = req.params;
      const { 
        questionId, 
        selectedOption, 
        timeSpent, 
        isFlagged = false,
        confidenceLevel = null
      } = req.body;

      // Get session with test details
      const session = await TestSession.findOne({
        where: { session_id: sessionId },
        include: [{
          model: Test,
          as: 'test',
          attributes: ['id', 'has_negative_marking', 'negative_marks']
        }]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (!['in_progress', 'paused'].includes(session.status)) {
        return res.status(400).json({
          success: false,
          message: 'Session is not active'
        });
      }

      // Get question details
      const question = await Question.findByPk(questionId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      // Check if answer already exists
      let userAnswer = await UserAnswer.findOne({
        where: {
          user_id: session.user_id,
          question_id: questionId,
          session_id: sessionId
        }
      });

      // Determine if answer is correct
      const isCorrect = selectedOption && selectedOption === question.correct_option;
      let marksObtained = 0;
      
      if (selectedOption) {
        if (isCorrect) {
          marksObtained = question.marks || 1;
        } else if (session.test.has_negative_marking) {
          marksObtained = -(session.test.negative_marks || 0.25);
        }
      }

      const now = new Date();

      // Create or update answer
      if (userAnswer) {
        const wasAnswered = !!userAnswer.selected_option;
        const optionChanges = userAnswer.selected_option !== selectedOption ? 
          userAnswer.option_changes + 1 : userAnswer.option_changes;

        await userAnswer.update({
          selected_option: selectedOption,
          is_correct: isCorrect,
          is_flagged: isFlagged,
          time_taken: timeSpent,
          marks_obtained: marksObtained,
          last_visit_time: now,
          visit_count: userAnswer.visit_count + 1,
          option_changes: optionChanges,
          confidence_level: confidenceLevel,
          language_used: session.selected_language
        });
      } else {
        userAnswer = await UserAnswer.create({
          user_id: session.user_id,
          question_id: questionId,
          test_id: session.test_id,
          session_id: sessionId,
          selected_option: selectedOption,
          is_correct: isCorrect,
          is_flagged: isFlagged,
          time_taken: timeSpent,
          marks_obtained: marksObtained,
          marks_possible: question.marks,
          first_visit_time: now,
          last_visit_time: now,
          visit_count: 1,
          confidence_level: confidenceLevel,
          language_used: session.selected_language
        });
      }

      // Update session progress
      const [answersCount, flaggedCount] = await Promise.all([
        UserAnswer.count({
          where: { 
            session_id: sessionId,
            selected_option: { [Op.ne]: null }
          }
        }),
        UserAnswer.count({
          where: { 
            session_id: sessionId,
            is_flagged: true
          }
        })
      ]);

      await session.update({
        current_question_id: questionId,
        questions_answered: answersCount,
        questions_flagged: flaggedCount,
        last_activity_at: now
      });

      res.json({
        success: true,
        message: 'Answer submitted successfully',
        data: {
          questionId,
          selectedOption,
          isCorrect,
          marksObtained,
          questionsAnswered: answersCount,
          questionsFlagged: flaggedCount
        }
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit answer',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Pause test session
   */
  async pauseTestSession(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await TestSession.findOne({
        where: { session_id: sessionId },
        include: [{
          model: Test,
          as: 'test',
          attributes: ['allows_pause', 'is_one_time']
        }]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (session.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          message: 'Session is not in progress'
        });
      }

      if (!session.test.allows_pause || session.test.is_one_time) {
        return res.status(400).json({
          success: false,
          message: 'This test cannot be paused'
        });
      }

      const now = new Date();
      const timeSpentSinceLastActivity = Math.floor((now - session.last_activity_at) / 1000);
      
      await session.update({
        status: 'paused',
        paused_at: now,
        total_time_spent: session.total_time_spent + timeSpentSinceLastActivity,
        remaining_time: Math.max(0, session.remaining_time - timeSpentSinceLastActivity),
        pause_count: session.pause_count + 1,
        last_activity_at: now
      });

      res.json({
        success: true,
        message: 'Test session paused successfully',
        data: {
          remainingTime: session.remaining_time,
          totalTimeSpent: session.total_time_spent + timeSpentSinceLastActivity,
          pauseCount: session.pause_count + 1
        }
      });
    } catch (error) {
      console.error('Error pausing test session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pause test session',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Resume test session
   */
  async resumeTestSession(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await TestSession.findOne({
        where: { session_id: sessionId }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (session.status !== 'paused') {
        return res.status(400).json({
          success: false,
          message: 'Session is not paused'
        });
      }

      if (session.remaining_time <= 0) {
        await session.update({ status: 'timed_out' });
        return res.status(400).json({
          success: false,
          message: 'Test time has expired'
        });
      }

      const now = new Date();
      const pauseDuration = Math.floor((now - session.paused_at) / 1000);

      await session.update({
        status: 'in_progress',
        resumed_at: now,
        pause_duration: session.pause_duration + pauseDuration,
        last_activity_at: now
      });

      res.json({
        success: true,
        message: 'Test session resumed successfully',
        data: {
          remainingTime: session.remaining_time,
          currentQuestionIndex: session.current_question_index,
          questionsAnswered: session.questions_answered
        }
      });
    } catch (error) {
      console.error('Error resuming test session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resume test session',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Submit complete test
   */
  async submitTest(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await TestSession.findOne({
        where: { session_id: sessionId },
        include: [{
          model: Test,
          as: 'test',
          attributes: ['id', 'title', 'title_gujarati', 'total_questions', 'total_marks', 'passing_marks']
        }]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (!['in_progress', 'paused'].includes(session.status)) {
        return res.status(400).json({
          success: false,
          message: 'Session cannot be submitted'
        });
      }

      // Calculate final results
      const answers = await UserAnswer.findAll({
        where: { session_id: sessionId }
      });

      const correctAnswers = answers.filter(a => a.is_correct).length;
      const wrongAnswers = answers.filter(a => a.selected_option && !a.is_correct).length;
      const unanswered = session.test.total_questions - answers.filter(a => a.selected_option).length;
      const totalScore = answers.reduce((sum, a) => sum + (a.marks_obtained || 0), 0);
      const maxPossibleScore = session.test.total_marks;
      const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
      const negativeMarks = answers.reduce((sum, a) => 
        sum + (a.marks_obtained < 0 ? Math.abs(a.marks_obtained) : 0), 0);

      const now = new Date();
      const timeSpentSinceLastActivity = Math.floor((now - session.last_activity_at) / 1000);
      const finalTimeSpent = session.total_time_spent + timeSpentSinceLastActivity;

      // Update session with results
      await session.update({
        status: 'completed',
        completed_at: now,
        total_time_spent: finalTimeSpent,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        percentage: Math.max(0, percentage),
        correct_answers: correctAnswers,
        wrong_answers: wrongAnswers,
        unanswered: unanswered,
        negative_marks: negativeMarks,
        is_passed: totalScore >= session.test.passing_marks,
        last_activity_at: now
      });

      // Calculate rank (simplified - you might want to implement more sophisticated ranking)
      const betterScores = await TestSession.count({
        where: {
          test_id: session.test_id,
          status: 'completed',
          percentage: { [Op.gt]: percentage }
        }
      });
      
      const rank = betterScores + 1;
      const totalCompletions = await TestSession.count({
        where: {
          test_id: session.test_id,
          status: 'completed'
        }
      });

      const percentile = totalCompletions > 1 ? 
        ((totalCompletions - rank) / (totalCompletions - 1)) * 100 : 100;

      await session.update({ rank, percentile });

      res.json({
        success: true,
        message: 'Test submitted successfully',
        data: {
          sessionId: session.session_id,
          results: {
            totalScore,
            maxPossibleScore,
            percentage: Math.round(percentage * 100) / 100,
            correctAnswers,
            wrongAnswers,
            unanswered,
            negativeMarks,
            timeSpent: finalTimeSpent,
            rank,
            percentile: Math.round(percentile * 100) / 100,
            isPassed: totalScore >= session.test.passing_marks,
            passingMarks: session.test.passing_marks
          },
          test: {
            title: session.test.title,
            titleGujarati: session.test.title_gujarati,
            totalQuestions: session.test.total_questions,
            totalMarks: session.test.total_marks
          }
        }
      });
    } catch (error) {
      console.error('Error submitting test:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit test',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Get session status
   */
  async getSessionStatus(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await TestSession.findOne({
        where: { session_id: sessionId },
        include: [{
          model: Test,
          as: 'test',
          attributes: ['id', 'title', 'title_gujarati', 'duration_minutes', 'total_questions']
        }]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: {
          sessionId: session.session_id,
          status: session.status,
          currentQuestionIndex: session.current_question_index,
          questionsAnswered: session.questions_answered,
          questionsFlagged: session.questions_flagged,
          remainingTime: session.remaining_time,
          totalTimeSpent: session.total_time_spent,
          pauseCount: session.pause_count,
          test: session.test
        }
      });
    } catch (error) {
      console.error('Error getting session status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Get user test history
   */
  async getUserTestHistory(req, res) {
    try {
      const { user_id } = req.query;
      const { page = 1, limit = 10 } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await TestSession.findAndCountAll({
        where: { 
          user_id,
          status: 'completed'
        },
        include: [
          {
            model: Test,
            as: 'test',
            attributes: ['id', 'title', 'title_gujarati', 'test_type'],
            include: [{
              model: TestSeries,
              as: 'testSeries',
              attributes: ['id', 'title', 'title_gujarati']
            }]
          }
        ],
        order: [['completed_at', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });

      res.json({
        success: true,
        data: {
          sessions: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching user test history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Get test results
   */
  async getTestResults(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await TestSession.findOne({
        where: { session_id: sessionId },
        include: [
          {
            model: Test,
            as: 'test',
            attributes: ['id', 'title', 'title_gujarati', 'total_questions', 'total_marks', 'show_results_immediately']
          },
          {
            model: UserAnswer,
            as: 'answers',
            include: [{
              model: Question,
              as: 'question',
              attributes: ['id', 'question', 'question_gujarati', 'options', 'options_gujarati', 'correct_option', 'explanation', 'explanation_gujarati']
            }],
            order: [['question', 'display_order', 'ASC']]
          }
        ]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (session.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Test not completed yet'
        });
      }

      res.json({
        success: true,
        data: {
          session: {
            sessionId: session.session_id,
            status: session.status,
            totalScore: session.total_score,
            percentage: session.percentage,
            correctAnswers: session.correct_answers,
            wrongAnswers: session.wrong_answers,
            unanswered: session.unanswered,
            timeSpent: session.total_time_spent,
            rank: session.rank,
            percentile: session.percentile,
            isPassed: session.is_passed
          },
          test: session.test,
          answers: session.answers
        }
      });
    } catch (error) {
      console.error('Error fetching test results:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test results',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = testController;