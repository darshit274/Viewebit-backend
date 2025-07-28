const ErrorHandler = require('../../utils/default/errorHandler');
const { Test_Series, Test, Questions, User } = require('../../models');
const { Op } = require('sequelize');
const NotificationTriggers = require('../../services/NotificationTriggers');

// Get all test series with pagination and filters
exports.getTestSeries = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        const offset = (page - 1) * limit;

        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (category) {
            whereClause.category = category;
        }

        const { count, rows } = await Test_Series.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            include: [
                {
                    model: Test,
                    as: 'tests',
                    attributes: ['id', 'title', 'is_active']
                }
            ]
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
        console.error('Get test series error:', err);
        const error = new ErrorHandler('Failed to fetch test series', 500);
        return next(error);
    }
};

// Get single test series by ID
exports.getTestSeriesById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const testSeries = await Test_Series.findByPk(id, {
            include: [
                {
                    model: Test,
                    as: 'tests',
                    include: [
                        {
                            model: Questions,
                            as: 'questions',
                            attributes: ['id', 'question_text', 'difficulty', 'subject']
                        }
                    ]
                }
            ]
        });

        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }

        res.status(200).json({
            success: true,
            data: testSeries
        });
    } catch (err) {
        console.error('Get test series by ID error:', err);
        const error = new ErrorHandler('Failed to fetch test series', 500);
        return next(error);
    }
};

// Create new test series
exports.createTestSeries = async (req, res, next) => {
    try {
        const {
            title,
            description,
            price,
            original_price,
            category,
            exam_type,
            total_tests,
            free_tests,
            duration_months,
            negative_marking,
            negative_marks,
            pass_percentage,
            instructions,
            is_active = true
        } = req.body;

        // Check if test series with same title exists
        const existingSeries = await Test_Series.findOne({ where: { title } });
        if (existingSeries) {
            return next(new ErrorHandler('Test series with this title already exists', 400));
        }

        const testSeries = await Test_Series.create({
            title,
            description,
            price,
            original_price,
            category,
            exam_type,
            total_tests,
            free_tests,
            duration_months,
            negative_marking,
            negative_marks,
            pass_percentage,
            instructions,
            is_active,
            created_by: req.admin.id
        });

        // Send notification to users about new test series (only if active)
        if (is_active) {
            try {
                await NotificationTriggers.onNewTestSeriesCreated({
                    uuid: testSeries.id,
                    title: testSeries.title,
                    description: testSeries.description,
                    category: testSeries.category,
                    total_tests: testSeries.total_tests,
                    price: testSeries.price,
                    is_free: testSeries.price === 0
                });
                console.log('✅ Notification sent for new test series:', testSeries.title);
            } catch (notificationError) {
                console.error('⚠️  Failed to send notification for new test series:', notificationError);
                // Don't fail the test series creation if notification fails
            }
        }

        res.status(201).json({
            success: true,
            message: 'Test series created successfully',
            data: testSeries
        });
    } catch (err) {
        console.error('Create test series error:', err);
        const error = new ErrorHandler('Failed to create test series', 500);
        return next(error);
    }
};

// Update test series
exports.updateTestSeries = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const testSeries = await Test_Series.findByPk(id);
        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }

        // Check if title is being changed and already exists
        if (updateData.title && updateData.title !== testSeries.title) {
            const existingSeries = await Test_Series.findOne({ 
                where: { 
                    title: updateData.title,
                    id: { [Op.ne]: id }
                } 
            });
            if (existingSeries) {
                return next(new ErrorHandler('Test series with this title already exists', 400));
            }
        }

        await testSeries.update(updateData);

        res.status(200).json({
            success: true,
            message: 'Test series updated successfully',
            data: testSeries
        });
    } catch (err) {
        console.error('Update test series error:', err);
        const error = new ErrorHandler('Failed to update test series', 500);
        return next(error);
    }
};

// Delete test series
exports.deleteTestSeries = async (req, res, next) => {
    try {
        const { id } = req.params;

        const testSeries = await Test_Series.findByPk(id);
        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }

        // Check if test series has associated tests
        const testsCount = await Test.count({ where: { test_series_id: id } });
        if (testsCount > 0) {
            return next(new ErrorHandler('Cannot delete test series with associated tests', 400));
        }

        await testSeries.destroy();

        res.status(200).json({
            success: true,
            message: 'Test series deleted successfully'
        });
    } catch (err) {
        console.error('Delete test series error:', err);
        const error = new ErrorHandler('Failed to delete test series', 500);
        return next(error);
    }
};

// Toggle test series status
exports.toggleTestSeriesStatus = async (req, res, next) => {
    try {
        const { id } = req.params;

        const testSeries = await Test_Series.findByPk(id);
        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }

        const oldStatus = testSeries.is_active;
        await testSeries.update({ is_active: !testSeries.is_active });

        // Send notification when test series is activated (from inactive to active)
        if (!oldStatus && testSeries.is_active) {
            try {
                await NotificationTriggers.onNewTestSeriesCreated({
                    uuid: testSeries.id,
                    title: testSeries.title,
                    description: testSeries.description,
                    category: testSeries.category,
                    total_tests: testSeries.total_tests,
                    price: testSeries.price,
                    is_free: testSeries.price === 0
                });
                console.log('✅ Notification sent for activated test series:', testSeries.title);
            } catch (notificationError) {
                console.error('⚠️  Failed to send notification for activated test series:', notificationError);
            }
        }

        res.status(200).json({
            success: true,
            message: `Test series ${testSeries.is_active ? 'activated' : 'deactivated'} successfully`,
            data: testSeries
        });
    } catch (err) {
        console.error('Toggle test series status error:', err);
        const error = new ErrorHandler('Failed to update test series status', 500);
        return next(error);
    }
};

// Get test series statistics
exports.getTestSeriesStats = async (req, res, next) => {
    try {
        const totalSeries = await Test_Series.count();
        const activeSeries = await Test_Series.count({ where: { is_active: true } });
        const freeSeries = await Test_Series.count({ where: { price: 0 } });
        const paidSeries = await Test_Series.count({ where: { price: { [Op.gt]: 0 } } });

        // Get category-wise count
        const categoryStats = await Test_Series.findAll({
            attributes: [
                'category',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['category'],
            order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: {
                total_series: totalSeries,
                active_series: activeSeries,
                free_series: freeSeries,
                paid_series: paidSeries,
                category_stats: categoryStats
            }
        });
    } catch (err) {
        console.error('Get test series stats error:', err);
        const error = new ErrorHandler('Failed to fetch test series statistics', 500);
        return next(error);
    }
};

// Get questions for a specific test series
exports.getTestSeriesQuestions = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const testSeries = await Test_Series.findByPk(id, {
            include: [
                {
                    model: Questions,
                    as: 'questions',
                    attributes: ['id', 'question_text', 'question_type', 'difficulty_level', 'marks', 'explanation', 'order_index'],
                    include: [
                        {
                            model: require('../../models').QuestionOption, // Assuming this model exists
                            as: 'options',
                            attributes: ['id', 'option_text', 'is_correct'],
                            required: false
                        }
                    ],
                    order: [['order_index', 'ASC']]
                }
            ]
        });

        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }

        res.status(200).json({
            success: true,
            data: testSeries.questions || []
        });
    } catch (err) {
        console.error('Get test series questions error:', err);
        const error = new ErrorHandler('Failed to fetch test series questions', 500);
        return next(error);
    }
};

// Add questions to test series
exports.addQuestionsToTestSeries = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { question_ids } = req.body;

        if (!question_ids || !Array.isArray(question_ids)) {
            return next(new ErrorHandler('Question IDs array is required', 400));
        }

        const testSeries = await Test_Series.findByPk(id);
        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }

        // Verify questions exist
        const questions = await Questions.findAll({
            where: { id: { [Op.in]: question_ids } }
        });

        if (questions.length !== question_ids.length) {
            return next(new ErrorHandler('One or more questions not found', 404));
        }

        // Add questions to test series (this would depend on your association table structure)
        // For now, assuming there's a test_questions junction table
        await testSeries.addQuestions(questions);

        res.status(200).json({
            success: true,
            message: `${questions.length} questions added to test series successfully`
        });
    } catch (err) {
        console.error('Add questions to test series error:', err);
        const error = new ErrorHandler('Failed to add questions to test series', 500);
        return next(error);
    }
};

// Remove questions from test series
exports.removeQuestionsFromTestSeries = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { question_ids } = req.body;

        if (!question_ids || !Array.isArray(question_ids)) {
            return next(new ErrorHandler('Question IDs array is required', 400));
        }

        const testSeries = await Test_Series.findByPk(id);
        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }

        // Remove questions from test series
        const questions = await Questions.findAll({
            where: { id: { [Op.in]: question_ids } }
        });

        await testSeries.removeQuestions(questions);

        res.status(200).json({
            success: true,
            message: `${questions.length} questions removed from test series successfully`
        });
    } catch (err) {
        console.error('Remove questions from test series error:', err);
        const error = new ErrorHandler('Failed to remove questions from test series', 500);
        return next(error);
    }
};