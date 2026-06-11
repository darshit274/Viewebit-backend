const ErrorHandler = require('../../utils/default/errorHandler');
const NotificationService = require('../../services/NotificationService');
const NotificationTriggers = require('../../services/NotificationTriggers');
const NotificationScheduler = require('../../services/NotificationScheduler');
const { User, TestSeries, pdfs: Pdf, Notification, PushToken } = require('../../models');
const { Op } = require('sequelize');

// Send manual notification to all users
exports.sendBroadcastNotification = async (req, res, next) => {
    try {
        const { title, body, type = 'general', priority = 'default', filters = {} } = req.body;

        if (!title || !body) {
            return next(new ErrorHandler('Title and body are required', 400));
        }

        const notificationData = {
            title,
            body,
            type,
            priority,
            data: {
                manual_broadcast: true,
                sent_by: req.admin.id,
                sent_at: new Date().toISOString()
            }
        };

        const result = await NotificationService.sendBroadcastNotification(notificationData, filters);

        if (!result.success) {
            return next(new ErrorHandler(result.error || 'Failed to send broadcast notification', 500));
        }

        res.status(200).json({
            success: true,
            message: 'Broadcast notification sent successfully',
            data: result
        });
    } catch (err) {
        console.error('Send broadcast notification error:', err);
        const error = new ErrorHandler('Failed to send broadcast notification', 500);
        return next(error);
    }
};

// Send notification to specific users
exports.sendTargetedNotification = async (req, res, next) => {
    try {
        const { userIds, title, body, type = 'general', priority = 'default' } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return next(new ErrorHandler('User IDs array is required', 400));
        }

        if (!title || !body) {
            return next(new ErrorHandler('Title and body are required', 400));
        }

        const notificationData = {
            title,
            body,
            type,
            priority,
            data: {
                targeted_notification: true,
                sent_by: req.admin.id,
                sent_at: new Date().toISOString()
            }
        };

        const result = await NotificationService.sendNotificationToUsers(userIds, notificationData);

        if (!result.success) {
            return next(new ErrorHandler(result.error || 'Failed to send targeted notification', 500));
        }

        res.status(200).json({
            success: true,
            message: 'Targeted notification sent successfully',
            data: result
        });
    } catch (err) {
        console.error('Send targeted notification error:', err);
        const error = new ErrorHandler('Failed to send targeted notification', 500);
        return next(error);
    }
};

// Trigger notifications for new content manually
exports.triggerNewContentNotification = async (req, res, next) => {
    try {
        const { contentType, contentId } = req.body;

        if (!contentType || !contentId) {
            return next(new ErrorHandler('Content type and ID are required', 400));
        }

        let result;
        
        switch (contentType) {
            case 'free_test':
                const freeTest = await FreeTest.findByPk(contentId);
                if (!freeTest) {
                    return next(new ErrorHandler('Free test not found', 404));
                }
                result = await NotificationTriggers.onNewFreeTestCreated({
                    uuid: freeTest.uuid,
                    title: freeTest.title,
                    description: freeTest.description,
                    category: freeTest.test_type
                });
                break;

            case 'test_series':
                const testSeries = await TestSeries.findByPk(contentId);
                if (!testSeries) {
                    return next(new ErrorHandler('Test series not found', 404));
                }
                result = await NotificationTriggers.onNewTestSeriesCreated({
                    uuid: testSeries.uuid,
                    title: testSeries.name,
                    description: testSeries.description,
                    category: testSeries.category,
                    total_tests: testSeries.total_tests,
                    price: testSeries.price,
                    is_free: testSeries.price === 0
                });
                break;

            case 'pdf':
                const pdf = await Pdf.findByPk(contentId);
                if (!pdf) {
                    return next(new ErrorHandler('PDF not found', 404));
                }
                result = await NotificationTriggers.onNewPdfCreated({
                    uuid: pdf.uuid,
                    title: pdf.title,
                    description: pdf.description,
                    category: pdf.category
                });
                break;

            default:
                return next(new ErrorHandler('Invalid content type', 400));
        }

        res.status(200).json({
            success: true,
            message: `Notification triggered for new ${contentType}`,
            data: result
        });
    } catch (err) {
        console.error('Trigger new content notification error:', err);
        const error = new ErrorHandler('Failed to trigger notification', 500);
        return next(error);
    }
};

// Schedule a notification for later
exports.scheduleNotification = async (req, res, next) => {
    try {
        const { title, body, type = 'general', priority = 'default', scheduleTime, jobId } = req.body;

        if (!title || !body || !scheduleTime) {
            return next(new ErrorHandler('Title, body, and schedule time are required', 400));
        }

        const scheduledDate = new Date(scheduleTime);
        if (scheduledDate <= new Date()) {
            return next(new ErrorHandler('Schedule time must be in the future', 400));
        }

        const notificationData = {
            title,
            body,
            type,
            priority,
            data: {
                scheduled: true,
                scheduled_by: req.admin.id
            }
        };

        const result = await NotificationScheduler.scheduleOneTimeNotification(
            notificationData,
            scheduledDate,
            jobId || `scheduled_${Date.now()}`
        );

        if (!result.success) {
            return next(new ErrorHandler(result.error || 'Failed to schedule notification', 500));
        }

        res.status(200).json({
            success: true,
            message: 'Notification scheduled successfully',
            data: result
        });
    } catch (err) {
        console.error('Schedule notification error:', err);
        const error = new ErrorHandler('Failed to schedule notification', 500);
        return next(error);
    }
};

// Cancel a scheduled notification
exports.cancelScheduledNotification = async (req, res, next) => {
    try {
        const { jobId } = req.params;

        if (!jobId) {
            return next(new ErrorHandler('Job ID is required', 400));
        }

        const result = NotificationScheduler.cancelScheduledNotification(jobId);

        if (!result) {
            return next(new ErrorHandler('Scheduled notification not found', 404));
        }

        res.status(200).json({
            success: true,
            message: 'Scheduled notification cancelled successfully'
        });
    } catch (err) {
        console.error('Cancel scheduled notification error:', err);
        const error = new ErrorHandler('Failed to cancel scheduled notification', 500);
        return next(error);
    }
};

// Get notification statistics
exports.getNotificationStats = async (req, res, next) => {
    try {
        const totalNotifications = await Notification.count();
        const sentToday = await Notification.count({
            where: {
                sent_at: {
                    [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });

        const activePushTokens = await PushToken.count({
            where: {
                is_active: true,
                expires_at: { [Op.gt]: new Date() }
            }
        });

        const notificationsByType = await Notification.findAll({
            attributes: [
                'type',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['type'],
            raw: true
        });

        const notificationsByStatus = await Notification.findAll({
            attributes: [
                'status',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const scheduledJobs = NotificationScheduler.getScheduledNotificationsCount();

        const stats = {
            total_notifications: totalNotifications,
            sent_today: sentToday,
            active_push_tokens: activePushTokens,
            scheduled_jobs: scheduledJobs,
            notifications_by_type: notificationsByType.reduce((acc, item) => {
                acc[item.type] = parseInt(item.count);
                return acc;
            }, {}),
            notifications_by_status: notificationsByStatus.reduce((acc, item) => {
                acc[item.status] = parseInt(item.count);
                return acc;
            }, {})
        };

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error('Get notification stats error:', err);
        const error = new ErrorHandler('Failed to fetch notification statistics', 500);
        return next(error);
    }
};

// Get notification history
exports.getNotificationHistory = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type;
        const status = req.query.status;

        const offset = (page - 1) * limit;
        const whereClause = {};

        if (type) {
            whereClause.type = type;
        }
        if (status) {
            whereClause.status = status;
        }

        const { count, rows } = await Notification.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['uuid', 'email', 'name'],
                    required: false
                }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']],
            attributes: [
                'id', 'title', 'body', 'type', 'status', 'topic',
                'sent_at', 'delivered_at', 'read_at', 'created_at'
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
        console.error('Get notification history error:', err);
        const error = new ErrorHandler('Failed to fetch notification history', 500);
        return next(error);
    }
};

// Send test notification
exports.sendTestNotification = async (req, res, next) => {
    try {
        const testNotificationData = {
            title: '🧪 Test Notification from Admin',
            body: 'This is a test notification to verify that the notification system is working correctly.',
            type: 'general',
            data: {
                test: true,
                timestamp: new Date().toISOString(),
                sent_by: req.admin.id
            },
            priority: 'high'
        };

        // Send to a limited number of users (latest 5 active users)
        const testUsers = await User.findAll({
            where: {
                is_active: true,
                email_verified: true
            },
            attributes: ['uuid'],
            order: [['last_login', 'DESC']],
            limit: 5
        });

        if (testUsers.length === 0) {
            return next(new ErrorHandler('No active users found to send test notification', 404));
        }

        const userIds = testUsers.map(user => user.uuid);
        const result = await NotificationService.sendNotificationToUsers(userIds, testNotificationData);

        res.status(200).json({
            success: true,
            message: 'Test notification sent successfully',
            data: {
                users_notified: result.successful_sends,
                users_failed: result.failed_sends
            }
        });
    } catch (err) {
        console.error('Send test notification error:', err);
        const error = new ErrorHandler('Failed to send test notification', 500);
        return next(error);
    }
};