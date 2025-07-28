const ErrorHandler = require('../utils/default/errorHandler');
const NotificationService = require('../services/NotificationService');
const { validatePushToken } = require('../config/firebase');

// Register push token for current user
exports.registerPushToken = async (req, res, next) => {
  try {
    const { pushToken, platform, deviceInfo } = req.body;
    const userId = req.user.uuid;

    if (!pushToken) {
      return next(new ErrorHandler('Push token is required', 400));
    }

    if (!platform || !['ios', 'android'].includes(platform)) {
      return next(new ErrorHandler('Valid platform (ios/android) is required', 400));
    }

    // Validate the push token with Firebase
    const validation = await validatePushToken(pushToken);
    if (!validation.valid) {
      return next(new ErrorHandler('Invalid push token', 400));
    }

    // Register the token
    const result = await NotificationService.registerPushToken(userId, {
      pushToken,
      platform,
      deviceInfo
    });

    if (!result.success) {
      return next(new ErrorHandler(result.error || 'Failed to register push token', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully'
    });

  } catch (error) {
    console.error('Register push token error:', error);
    return next(new ErrorHandler('Failed to register push token', 500));
  }
};

// Send notification to specific user (Admin only)
exports.sendNotificationToUser = async (req, res, next) => {
  try {
    const { userId, title, body, type, data, priority } = req.body;

    if (!userId || !title || !body) {
      return next(new ErrorHandler('User ID, title, and body are required', 400));
    }

    const notificationData = {
      title,
      body,
      type: type || 'general',
      data: data || {},
      priority: priority || 'high'
    };

    const result = await NotificationService.sendNotificationToUser(userId, notificationData);

    if (!result.success) {
      return next(new ErrorHandler(result.error || 'Failed to send notification', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        notification_id: result.notification_id,
        devices_reached: result.devices_reached,
        devices_failed: result.devices_failed
      }
    });

  } catch (error) {
    console.error('Send notification to user error:', error);
    return next(new ErrorHandler('Failed to send notification', 500));
  }
};

// Send broadcast notification (Admin only)
exports.sendBroadcastNotification = async (req, res, next) => {
  try {
    const { title, body, type, data, priority, filters } = req.body;

    if (!title || !body) {
      return next(new ErrorHandler('Title and body are required', 400));
    }

    const notificationData = {
      title,
      body,
      type: type || 'general',
      data: data || {},
      priority: priority || 'high'
    };

    const result = await NotificationService.sendBroadcastNotification(notificationData, filters || {});

    if (!result.success) {
      return next(new ErrorHandler(result.error || 'Failed to send broadcast notification', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Broadcast notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Send broadcast notification error:', error);
    return next(new ErrorHandler('Failed to send broadcast notification', 500));
  }
};

// Get user's notifications
exports.getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.uuid;
    const { page = 1, limit = 20, type } = req.query;

    const result = await NotificationService.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type
    });

    if (!result.success) {
      return next(new ErrorHandler(result.error || 'Failed to get notifications', 500));
    }

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Get user notifications error:', error);
    return next(new ErrorHandler('Failed to get notifications', 500));
  }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.uuid;

    if (!notificationId) {
      return next(new ErrorHandler('Notification ID is required', 400));
    }

    const result = await NotificationService.markNotificationAsRead(notificationId, userId);

    if (!result.success) {
      return next(new ErrorHandler(result.error || 'Failed to mark notification as read', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    return next(new ErrorHandler('Failed to mark notification as read', 500));
  }
};

// Get notification statistics (Admin only)
exports.getNotificationStats = async (req, res, next) => {
  try {
    const { Notification, PushToken } = require('../models');
    const { Op } = require('sequelize');

    // Get basic stats
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

    const stats = {
      total_notifications: totalNotifications,
      sent_today: sentToday,
      active_push_tokens: activePushTokens,
      notifications_by_type: notificationsByType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {})
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    return next(new ErrorHandler('Failed to get notification statistics', 500));
  }
};

// Send test notification (Admin only)
exports.sendTestNotification = async (req, res, next) => {
  try {
    const userId = req.user.uuid;

    const testNotificationData = {
      title: '🧪 Test Notification',
      body: 'This is a test notification to verify your push notification setup is working correctly.',
      type: 'general',
      data: {
        test: true,
        timestamp: new Date().toISOString()
      },
      priority: 'high'
    };

    const result = await NotificationService.sendNotificationToUser(userId, testNotificationData);

    if (!result.success) {
      return next(new ErrorHandler(result.error || 'Failed to send test notification', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      data: {
        notification_id: result.notification_id,
        devices_reached: result.devices_reached
      }
    });

  } catch (error) {
    console.error('Send test notification error:', error);
    return next(new ErrorHandler('Failed to send test notification', 500));
  }
};

// Quiz-specific notifications
exports.sendQuizReminder = async (req, res, next) => {
  try {
    const { userId, quizData } = req.body;

    if (!userId || !quizData) {
      return next(new ErrorHandler('User ID and quiz data are required', 400));
    }

    const result = await NotificationService.sendQuizReminder(userId, quizData);

    if (!result.success) {
      return next(new ErrorHandler(result.error || 'Failed to send quiz reminder', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Quiz reminder sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Send quiz reminder error:', error);
    return next(new ErrorHandler('Failed to send quiz reminder', 500));
  }
};

// Test result notifications
exports.sendTestResultNotification = async (req, res, next) => {
  try {
    const { userId, resultData } = req.body;

    if (!userId || !resultData) {
      return next(new ErrorHandler('User ID and result data are required', 400));
    }

    const result = await NotificationService.sendTestResultNotification(userId, resultData);

    if (!result.success) {
      return next(new ErrorHandler(result.error || 'Failed to send test result notification', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Test result notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Send test result notification error:', error);
    return next(new ErrorHandler('Failed to send test result notification', 500));
  }
};

// New content notifications
exports.sendNewContentNotification = async (req, res, next) => {
  try {
    const { contentData, targetUsers } = req.body;

    if (!contentData) {
      return next(new ErrorHandler('Content data is required', 400));
    }

    const result = await NotificationService.sendNewContentNotification(contentData, targetUsers);

    if (!result.success) {
      return next(new ErrorHandler(result.error || 'Failed to send new content notification', 500));
    }

    res.status(200).json({
      success: true,
      message: 'New content notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Send new content notification error:', error);
    return next(new ErrorHandler('Failed to send new content notification', 500));
  }
};