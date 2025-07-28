const ErrorHandler = require('../../utils/default/errorHandler');
const { FreeTest, Subject, SubjectHierarchy, NewQuestion } = require('../../models');
const { Op } = require('sequelize');
const NotificationTriggers = require('../../services/NotificationTriggers');

// Get all free tests with pagination and filters (Admin view)
exports.getFreeTests = async (req, res, next) => {
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
            whereClause.test_type = category;
        }

        const { count, rows } = await FreeTest.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['id', 'name']
                }
            ],
            limit,
            offset,
            order: [[sortBy, sortOrder]]
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
        console.error('Admin get free tests error:', err);
        const error = new ErrorHandler('Failed to fetch free tests', 500);
        return next(error);
    }
};

// Get single free test by ID (Admin view)
exports.getFreeTestById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const test = await FreeTest.findByPk(id, {
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['id', 'name']
                },
                {
                    model: SubjectHierarchy,
                    as: 'subjectHierarchy',
                    attributes: ['id', 'name', 'parent_id']
                }
            ]
        });

        if (!test) {
            return next(new ErrorHandler('Free test not found', 404));
        }

        res.status(200).json({
            success: true,
            data: test
        });
    } catch (err) {
        console.error('Admin get free test by ID error:', err);
        const error = new ErrorHandler('Failed to fetch free test', 500);
        return next(error);
    }
};

// Create new free test
exports.createFreeTest = async (req, res, next) => {
    try {
        const {
            title,
            description,
            test_type,
            duration_minutes = 60,
            total_questions,
            negative_marking = false,
            negative_marks = 0.25,
            allows_pause_resume = true,
            supports_multilanguage = false,
            instructions,
            is_featured = false,
            is_active = true,
            subject_id,
            subject_hierarchy_id
        } = req.body;

        // Check if free test with same title exists
        const existingTest = await FreeTest.findOne({ where: { title } });
        if (existingTest) {
            return next(new ErrorHandler('Free test with this title already exists', 400));
        }

        const freeTest = await FreeTest.create({
            title,
            description,
            test_type,
            duration_minutes,
            total_questions,
            negative_marking,
            negative_marks,
            allows_pause_resume,
            supports_multilanguage,
            instructions,
            is_featured,
            is_active,
            subject_id,
            subject_hierarchy_id,
            created_by: req.admin.id
        });

        // Send notification to users about new free test (only if active)
        if (is_active) {
            try {
                await NotificationTriggers.onNewFreeTestCreated({
                    uuid: freeTest.uuid,
                    title: freeTest.title,
                    description: freeTest.description,
                    category: freeTest.test_type,
                    duration_minutes: freeTest.duration_minutes,
                    total_questions: freeTest.total_questions
                });
                console.log('✅ Notification sent for new free test:', freeTest.title);
            } catch (notificationError) {
                console.error('⚠️  Failed to send notification for new free test:', notificationError);
                // Don't fail the test creation if notification fails
            }
        }

        res.status(201).json({
            success: true,
            message: 'Free test created successfully',
            data: freeTest
        });
    } catch (err) {
        console.error('Create free test error:', err);
        const error = new ErrorHandler('Failed to create free test', 500);
        return next(error);
    }
};

// Update free test
exports.updateFreeTest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const freeTest = await FreeTest.findByPk(id);
        if (!freeTest) {
            return next(new ErrorHandler('Free test not found', 404));
        }

        // Check if title is being changed and already exists
        if (updateData.title && updateData.title !== freeTest.title) {
            const existingTest = await FreeTest.findOne({ 
                where: { 
                    title: updateData.title,
                    id: { [Op.ne]: id }
                } 
            });
            if (existingTest) {
                return next(new ErrorHandler('Free test with this title already exists', 400));
            }
        }

        await freeTest.update(updateData);

        res.status(200).json({
            success: true,
            message: 'Free test updated successfully',
            data: freeTest
        });
    } catch (err) {
        console.error('Update free test error:', err);
        const error = new ErrorHandler('Failed to update free test', 500);
        return next(error);
    }
};

// Delete free test
exports.deleteFreeTest = async (req, res, next) => {
    try {
        const { id } = req.params;

        const freeTest = await FreeTest.findByPk(id);
        if (!freeTest) {
            return next(new ErrorHandler('Free test not found', 404));
        }

        // Check if test has associated questions
        const questionsCount = await NewQuestion.count({ 
            where: { 
                test_id: freeTest.uuid,
                test_type: 'free' 
            } 
        });
        
        if (questionsCount > 0) {
            return next(new ErrorHandler('Cannot delete free test with associated questions', 400));
        }

        await freeTest.destroy();

        res.status(200).json({
            success: true,
            message: 'Free test deleted successfully'
        });
    } catch (err) {
        console.error('Delete free test error:', err);
        const error = new ErrorHandler('Failed to delete free test', 500);
        return next(error);
    }
};

// Toggle free test status
exports.toggleFreeTestStatus = async (req, res, next) => {
    try {
        const { id } = req.params;

        const freeTest = await FreeTest.findByPk(id);
        if (!freeTest) {
            return next(new ErrorHandler('Free test not found', 404));
        }

        const oldStatus = freeTest.is_active;
        await freeTest.update({ is_active: !freeTest.is_active });

        // Send notification when free test is activated (from inactive to active)
        if (!oldStatus && freeTest.is_active) {
            try {
                await NotificationTriggers.onNewFreeTestCreated({
                    uuid: freeTest.uuid,
                    title: freeTest.title,
                    description: freeTest.description,
                    category: freeTest.test_type,
                    duration_minutes: freeTest.duration_minutes,
                    total_questions: freeTest.total_questions
                });
                console.log('✅ Notification sent for activated free test:', freeTest.title);
            } catch (notificationError) {
                console.error('⚠️  Failed to send notification for activated free test:', notificationError);
            }
        }

        res.status(200).json({
            success: true,
            message: `Free test ${freeTest.is_active ? 'activated' : 'deactivated'} successfully`,
            data: freeTest
        });
    } catch (err) {
        console.error('Toggle free test status error:', err);
        const error = new ErrorHandler('Failed to update free test status', 500);
        return next(error);
    }
};

// Toggle featured status
exports.toggleFeaturedStatus = async (req, res, next) => {
    try {
        const { id } = req.params;

        const freeTest = await FreeTest.findByPk(id);
        if (!freeTest) {
            return next(new ErrorHandler('Free test not found', 404));
        }

        await freeTest.update({ is_featured: !freeTest.is_featured });

        res.status(200).json({
            success: true,
            message: `Free test ${freeTest.is_featured ? 'marked as featured' : 'removed from featured'} successfully`,
            data: freeTest
        });
    } catch (err) {
        console.error('Toggle featured status error:', err);
        const error = new ErrorHandler('Failed to update featured status', 500);
        return next(error);
    }
};

// Get free test statistics
exports.getFreeTestStats = async (req, res, next) => {
    try {
        const totalTests = await FreeTest.count();
        const activeTests = await FreeTest.count({ where: { is_active: true } });
        const featuredTests = await FreeTest.count({ where: { is_featured: true } });

        // Get type-wise count
        const typeStats = await FreeTest.findAll({
            attributes: [
                'test_type',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['test_type'],
            order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: {
                total_tests: totalTests,
                active_tests: activeTests,
                featured_tests: featuredTests,
                type_stats: typeStats
            }
        });
    } catch (err) {
        console.error('Get free test stats error:', err);
        const error = new ErrorHandler('Failed to fetch free test statistics', 500);
        return next(error);
    }
};

// Bulk operations
exports.bulkUpdateFreeTests = async (req, res, next) => {
    try {
        const { test_ids, action, value } = req.body;

        if (!test_ids || !Array.isArray(test_ids) || test_ids.length === 0) {
            return next(new ErrorHandler('Test IDs array is required', 400));
        }

        if (!action || !['activate', 'deactivate', 'feature', 'unfeature', 'delete'].includes(action)) {
            return next(new ErrorHandler('Valid action is required (activate, deactivate, feature, unfeature, delete)', 400));
        }

        let updateData = {};
        let successMessage = '';

        switch (action) {
            case 'activate':
                updateData = { is_active: true };
                successMessage = 'Free tests activated';
                break;
            case 'deactivate':
                updateData = { is_active: false };
                successMessage = 'Free tests deactivated';
                break;
            case 'feature':
                updateData = { is_featured: true };
                successMessage = 'Free tests marked as featured';
                break;
            case 'unfeature':
                updateData = { is_featured: false };
                successMessage = 'Free tests removed from featured';
                break;
            case 'delete':
                // Check for questions before deletion
                const questionsCount = await NewQuestion.count({ 
                    where: { 
                        test_id: { [Op.in]: test_ids },
                        test_type: 'free' 
                    } 
                });
                
                if (questionsCount > 0) {
                    return next(new ErrorHandler('Cannot delete free tests with associated questions', 400));
                }
                
                await FreeTest.destroy({ where: { id: { [Op.in]: test_ids } } });
                
                return res.status(200).json({
                    success: true,
                    message: `${test_ids.length} free tests deleted successfully`
                });
        }

        const [affectedRows] = await FreeTest.update(updateData, {
            where: { id: { [Op.in]: test_ids } }
        });

        res.status(200).json({
            success: true,
            message: `${successMessage} successfully`,
            affected_rows: affectedRows
        });
    } catch (err) {
        console.error('Bulk update free tests error:', err);
        const error = new ErrorHandler('Failed to perform bulk operation', 500);
        return next(error);
    }
};