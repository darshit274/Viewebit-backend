const ErrorHandler = require('../../utils/default/errorHandler');
const { Subscription, User, TestSeries, ExamType } = require('../../models');
const { Op } = require('sequelize');
const { updateUserSubscriptionStatus } = require('../../utils/subscriptionHelper');

// Get user's subscriptions
exports.getUserSubscriptions = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status || 'all';
        
        const offset = (page - 1) * limit;
        
        const whereClause = { user_id: userId };
        if (status !== 'all') {
            whereClause.status = status;
        }
        
        const { count, rows } = await Subscription.findAndCountAll({
            where: whereClause,
            include: [{
                model: TestSeries,
                as: 'testSeries',
                attributes: ['id', 'title', 'description', 'total_tests', 'price']
            }],
            limit,
            offset,
            order: [['purchase_date', 'DESC']]
        });
        
        // Check active status for each subscription
        const subscriptionsWithStatus = rows.map(sub => {
            const subData = sub.toJSON();
            const now = new Date();
            const isActive = sub.status === 'completed' && 
                           (!sub.expiry_date || new Date(sub.expiry_date) > now);
            
            return {
                ...subData,
                is_active: isActive,
                days_remaining: isActive && sub.expiry_date ? 
                    Math.max(0, Math.ceil((new Date(sub.expiry_date) - now) / (1000 * 60 * 60 * 24))) : 
                    null
            };
        });
        
        res.status(200).json({
            success: true,
            data: subscriptionsWithStatus,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        console.error('Get user subscriptions error:', err);
        const error = new ErrorHandler('Failed to fetch subscriptions', 500);
        return next(error);
    }
};

// Get subscription details
exports.getSubscriptionDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.uuid;
        
        const subscription = await Subscription.findOne({
            where: { 
                id,
                user_id: userId 
            },
            include: [{
                model: TestSeries,
                as: 'testSeries',
                attributes: ['id', 'title', 'description', 'total_tests', 'price', 'duration_months']
            }]
        });
        
        if (!subscription) {
            return next(new ErrorHandler('Subscription not found', 404));
        }
        
        const now = new Date();
        const isActive = subscription.status === 'completed' && 
                       (!subscription.expiry_date || new Date(subscription.expiry_date) > now);
        
        const subscriptionData = subscription.toJSON();
        subscriptionData.is_active = isActive;
        subscriptionData.days_remaining = isActive && subscription.expiry_date ? 
            Math.max(0, Math.ceil((new Date(subscription.expiry_date) - now) / (1000 * 60 * 60 * 24))) : 
            null;
        
        res.status(200).json({
            success: true,
            data: subscriptionData
        });
    } catch (err) {
        console.error('Get subscription details error:', err);
        const error = new ErrorHandler('Failed to fetch subscription details', 500);
        return next(error);
    }
};

// Create subscription (purchase)
exports.createSubscription = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const { 
            test_series_id, 
            transaction_id, 
            payment_method,
            amount_paid,
            currency = 'INR'
        } = req.body;
        
        // Validate required fields
        if (!test_series_id || !transaction_id || !amount_paid) {
            return next(new ErrorHandler('Missing required fields', 400));
        }
        
        // Check if test series exists
        const testSeries = await TestSeries.findByPk(test_series_id);
        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }
        
        // Check if user already has an active subscription for this test series
        const existingSubscription = await Subscription.findOne({
            where: {
                user_id: userId,
                test_series_id,
                status: 'completed',
                [Op.or]: [
                    { expiry_date: null },
                    { expiry_date: { [Op.gt]: new Date() } }
                ]
            }
        });
        
        if (existingSubscription) {
            return next(new ErrorHandler('You already have an active subscription for this test series', 400));
        }
        
        // Check if transaction ID already exists
        const existingTransaction = await Subscription.findOne({
            where: { transaction_id }
        });
        
        if (existingTransaction) {
            return next(new ErrorHandler('Transaction ID already exists', 400));
        }
        
        // Calculate expiry date based on test series duration
        let expiryDate = null;
        if (testSeries.duration_months) {
            expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + testSeries.duration_months);
        }
        
        // Create subscription
        const subscription = await Subscription.create({
            user_id: userId,
            test_series_id,
            transaction_id,
            payment_method,
            amount_paid,
            currency,
            status: 'completed',
            purchase_date: new Date(),
            expiry_date: expiryDate
        });
        
        // Fetch the created subscription with test series details
        const createdSubscription = await Subscription.findByPk(subscription.id, {
            include: [{
                model: TestSeries,
                as: 'testSeries',
                attributes: ['id', 'title', 'description', 'total_tests', 'price']
            }]
        });
        
        // Update user's subscription status
        await updateUserSubscriptionStatus(userId);
        
        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: createdSubscription
        });
    } catch (err) {
        console.error('Create subscription error:', err);
        const error = new ErrorHandler('Failed to create subscription', 500);
        return next(error);
    }
};

// Check subscription status for a test series
exports.checkSubscriptionStatus = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const { testSeriesId } = req.params;
        
        const subscription = await Subscription.findOne({
            where: {
                user_id: userId,
                test_series_id: testSeriesId,
                status: 'completed',
                [Op.or]: [
                    { expiry_date: null },
                    { expiry_date: { [Op.gt]: new Date() } }
                ]
            }
        });
        
        const hasActiveSubscription = !!subscription;
        
        res.status(200).json({
            success: true,
            data: {
                has_active_subscription: hasActiveSubscription,
                subscription: hasActiveSubscription ? {
                    id: subscription.id,
                    purchase_date: subscription.purchase_date,
                    expiry_date: subscription.expiry_date,
                    days_remaining: subscription.expiry_date ? 
                        Math.max(0, Math.ceil((new Date(subscription.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))) : 
                        null
                } : null
            }
        });
    } catch (err) {
        console.error('Check subscription status error:', err);
        const error = new ErrorHandler('Failed to check subscription status', 500);
        return next(error);
    }
};

// Cancel subscription
exports.cancelSubscription = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        const { id } = req.params;
        
        const subscription = await Subscription.findOne({
            where: { 
                id,
                user_id: userId,
                status: 'completed'
            }
        });
        
        if (!subscription) {
            return next(new ErrorHandler('Active subscription not found', 404));
        }
        
        // Update subscription status
        subscription.status = 'refunded';
        subscription.expiry_date = new Date(); // Set expiry to now
        await subscription.save();
        
        // Update user's subscription status
        await updateUserSubscriptionStatus(userId);
        
        res.status(200).json({
            success: true,
            message: 'Subscription cancelled successfully',
            data: subscription
        });
    } catch (err) {
        console.error('Cancel subscription error:', err);
        const error = new ErrorHandler('Failed to cancel subscription', 500);
        return next(error);
    }
};

// Get subscription statistics for user
exports.getUserSubscriptionStats = async (req, res, next) => {
    try {
        const userId = req.user.uuid;
        
        const [
            totalSubscriptions,
            activeSubscriptions,
            expiredSubscriptions,
            totalSpent
        ] = await Promise.all([
            // Total subscriptions
            Subscription.count({
                where: { 
                    user_id: userId,
                    status: 'completed'
                }
            }),
            // Active subscriptions
            Subscription.count({
                where: {
                    user_id: userId,
                    status: 'completed',
                    [Op.or]: [
                        { expiry_date: null },
                        { expiry_date: { [Op.gt]: new Date() } }
                    ]
                }
            }),
            // Expired subscriptions
            Subscription.count({
                where: {
                    user_id: userId,
                    status: 'completed',
                    expiry_date: { [Op.lte]: new Date() }
                }
            }),
            // Total amount spent
            Subscription.sum('amount_paid', {
                where: {
                    user_id: userId,
                    status: 'completed'
                }
            })
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                total_subscriptions: totalSubscriptions,
                active_subscriptions: activeSubscriptions,
                expired_subscriptions: expiredSubscriptions,
                total_spent: totalSpent || 0
            }
        });
    } catch (err) {
        console.error('Get subscription stats error:', err);
        const error = new ErrorHandler('Failed to fetch subscription statistics', 500);
        return next(error);
    }
};

// Admin: Get all subscriptions
exports.getAllSubscriptions = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const sortBy = req.query.sortBy || 'purchase_date';
        const sortOrder = req.query.sortOrder || 'DESC';
        
        const offset = (page - 1) * limit;
        
        const whereClause = {};
        if (status !== 'all') {
            whereClause.status = status;
        }
        
        // Check if there are any subscriptions
        const simpleCount = await Subscription.count();
        if (simpleCount === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                pagination: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 0
                }
            });
        }
        
        const includeClause = [
            {
                model: User,
                as: 'user',
                attributes: ['uuid', 'username', 'email', 'profileImage'],
                required: false
            },
            {
                model: TestSeries,
                as: 'testSeries',
                attributes: ['id', 'title', 'price'],
                required: false
            }
        ];

        // Add user search filter if provided
        if (search) {
            includeClause[0].where = {
                [Op.or]: [
                    { username: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } }
                ]
            };
        }
        
        const { count, rows } = await Subscription.findAndCountAll({
            where: whereClause,
            include: includeClause,
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
        console.error('Get all subscriptions error:', err);
        const error = new ErrorHandler('Failed to fetch subscriptions', 500);
        return next(error);
    }
};

// Admin: Update subscription status
exports.updateSubscriptionStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, expiry_date } = req.body;
        
        const subscription = await Subscription.findByPk(id);
        if (!subscription) {
            return next(new ErrorHandler('Subscription not found', 404));
        }
        
        if (status) {
            subscription.status = status;
        }
        
        if (expiry_date !== undefined) {
            subscription.expiry_date = expiry_date;
        }
        
        await subscription.save();
        
        // Update user's subscription status
        await updateUserSubscriptionStatus(subscription.user_id);
        
        res.status(200).json({
            success: true,
            message: 'Subscription updated successfully',
            data: subscription
        });
    } catch (err) {
        console.error('Update subscription status error:', err);
        const error = new ErrorHandler('Failed to update subscription', 500);
        return next(error);
    }
};

// Admin: Get subscription statistics
exports.getSubscriptionStats = async (req, res, next) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const [
            totalSubscriptions,
            activeSubscriptions,
            totalRevenue,
            monthlyRevenue
        ] = await Promise.all([
            // Total subscriptions
            Subscription.count({
                where: { status: 'completed' }
            }),
            // Active subscriptions
            Subscription.count({
                where: {
                    status: 'completed',
                    [Op.or]: [
                        { expiry_date: null },
                        { expiry_date: { [Op.gt]: now } }
                    ]
                }
            }),
            // Total revenue
            Subscription.sum('amount_paid', {
                where: { status: 'completed' }
            }),
            // Monthly revenue
            Subscription.sum('amount_paid', {
                where: {
                    status: 'completed',
                    purchase_date: { [Op.gte]: startOfMonth }
                }
            })
        ]);
        
        const expiredSubscriptions = await Subscription.count({
            where: {
                status: 'completed',
                expiry_date: { [Op.lte]: now }
            }
        });
        
        res.status(200).json({
            success: true,
            data: {
                total_subscriptions: totalSubscriptions || 0,
                active_subscriptions: activeSubscriptions || 0,
                expired_subscriptions: expiredSubscriptions || 0,
                total_revenue: totalRevenue || 0,
                monthly_revenue: monthlyRevenue || 0
            }
        });
    } catch (err) {
        console.error('Get subscription stats error:', err);
        const error = new ErrorHandler('Failed to fetch subscription statistics', 500);
        return next(error);
    }
};

// Admin: Export subscriptions to CSV
exports.exportSubscriptions = async (req, res, next) => {
    try {
        const subscriptions = await Subscription.findAll({
            where: { status: 'completed' },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['username', 'email']
                },
                {
                    model: TestSeries,
                    as: 'testSeries',
                    attributes: ['title']
                }
            ],
            order: [['purchase_date', 'DESC']]
        });
        
        // Create CSV content
        const csvHeader = 'ID,Username,Email,Test Series,Transaction ID,Amount,Currency,Status,Purchase Date,Expiry Date\n';
        const csvRows = subscriptions.map(sub => {
            return [
                sub.id,
                sub.user.username,
                sub.user.email,
                sub.testSeries.title,
                sub.transaction_id,
                sub.amount_paid,
                sub.currency,
                sub.status,
                new Date(sub.purchase_date).toISOString().split('T')[0],
                sub.expiry_date ? new Date(sub.expiry_date).toISOString().split('T')[0] : 'Lifetime'
            ].join(',');
        }).join('\n');
        
        const csv = csvHeader + csvRows;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=subscriptions_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Export subscriptions error:', err);
        const error = new ErrorHandler('Failed to export subscriptions', 500);
        return next(error);
    }
};

// Admin: Create manual subscription
exports.createManualSubscription = async (req, res, next) => {
    try {
        const { 
            user_id, 
            test_series_id, 
            transaction_id, 
            payment_method,
            amount_paid,
            currency = 'INR',
            status = 'completed',
            expiry_date
        } = req.body;
        
        // Validate required fields
        if (!user_id || !test_series_id || !transaction_id || !amount_paid) {
            return next(new ErrorHandler('Missing required fields', 400));
        }
        
        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return next(new ErrorHandler('User not found', 404));
        }
        
        // Check if test series exists
        const testSeries = await TestSeries.findByPk(test_series_id);
        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }
        
        // Check if transaction ID already exists
        const existingTransaction = await Subscription.findOne({
            where: { transaction_id }
        });
        
        if (existingTransaction) {
            return next(new ErrorHandler('Transaction ID already exists', 400));
        }
        
        // Use provided expiry date or calculate based on test series duration
        let finalExpiryDate = null;
        if (expiry_date) {
            finalExpiryDate = new Date(expiry_date);
        } else if (testSeries.duration_months) {
            finalExpiryDate = new Date();
            finalExpiryDate.setMonth(finalExpiryDate.getMonth() + testSeries.duration_months);
        }
        
        // Create subscription
        const subscription = await Subscription.create({
            user_id,
            test_series_id,
            transaction_id,
            payment_method,
            amount_paid,
            currency,
            status,
            purchase_date: new Date(),
            expiry_date: finalExpiryDate
        });
        
        // Update user's subscription status
        await updateUserSubscriptionStatus(user_id);
        
        // Fetch the created subscription with details
        const createdSubscription = await Subscription.findByPk(subscription.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['uuid', 'username', 'email']
                },
                {
                    model: TestSeries,
                    as: 'testSeries',
                    attributes: ['id', 'title', 'price']
                }
            ]
        });
        
        res.status(201).json({
            success: true,
            message: 'Manual subscription created successfully',
            data: createdSubscription
        });
    } catch (err) {
        console.error('Create manual subscription error:', err);
        const error = new ErrorHandler('Failed to create manual subscription', 500);
        return next(error);
    }
};