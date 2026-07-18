const ErrorHandler = require('../../utils/default/errorHandler');
const { Subscription, User, TestSeries, ExamType, PdfCategory } = require('../../models');
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
                attributes: ['id', 'name', 'description', 'price']
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
                attributes: ['id', 'name', 'description', 'price']
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
        
        // Calculate expiry date - default to 365 days (1 year)
        const DEFAULT_SUBSCRIPTION_DAYS = 365;
        let expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + DEFAULT_SUBSCRIPTION_DAYS);
        
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
                attributes: ['id', 'name', 'description', 'price']
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
                attributes: ['id', 'name', 'price'],
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
        const { branch_id, department_id, date_from, date_to } = req.query;

        // Branch/department filtering requires joining through the TestSeries a
        // subscription was purchased against (Phase 0 added branch_id/department_id
        // scoping there) — PDF-only subscriptions (test_series_id null) are excluded
        // when a branch/department filter is active, since they have no org scoping.
        const needsSeriesJoin = !!(branch_id || department_id);
        const seriesWhere = {};
        if (branch_id) seriesWhere.branch_id = branch_id;
        if (department_id) seriesWhere.department_id = department_id;

        const dateRangeWhere = {};
        if (date_from || date_to) {
            dateRangeWhere.purchase_date = {};
            if (date_from) dateRangeWhere.purchase_date[Op.gte] = new Date(date_from);
            if (date_to) {
                const to = new Date(date_to);
                to.setHours(23, 59, 59, 999);
                dateRangeWhere.purchase_date[Op.lte] = to;
            }
        }

        const baseWhere = { status: 'completed', ...dateRangeWhere };
        const includeOptions = needsSeriesJoin
            ? [{ model: TestSeries, as: 'testSeries', attributes: [], where: seriesWhere, required: true }]
            : [];

        const [
            totalSubscriptions,
            activeSubscriptions,
            totalRevenue,
            monthlyRevenue
        ] = await Promise.all([
            Subscription.count({ where: baseWhere, include: includeOptions }),
            Subscription.count({
                where: {
                    ...baseWhere,
                    [Op.or]: [
                        { expiry_date: null },
                        { expiry_date: { [Op.gt]: now } }
                    ]
                },
                include: includeOptions
            }),
            Subscription.sum('amount_paid', { where: baseWhere, include: includeOptions }),
            Subscription.sum('amount_paid', {
                where: { ...baseWhere, purchase_date: { [Op.gte]: startOfMonth } },
                include: includeOptions
            })
        ]);

        const expiredSubscriptions = await Subscription.count({
            where: { ...baseWhere, expiry_date: { [Op.lte]: now } },
            include: includeOptions
        });

        // Revenue trend — last 6 months (or the filtered date range if narrower),
        // grouped by calendar month, for the Revenue page's chart.
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const trendStart = dateRangeWhere.purchase_date?.[Op.gte] || sixMonthsAgo;
        const revenueByMonth = await Subscription.findAll({
            attributes: [
                [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('Subscription.purchase_date'), '%Y-%m'), 'month'],
                [require('sequelize').fn('SUM', require('sequelize').col('amount_paid')), 'revenue']
            ],
            where: { status: 'completed', purchase_date: { [Op.gte]: trendStart } },
            include: includeOptions,
            group: [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('Subscription.purchase_date'), '%Y-%m')],
            order: [[require('sequelize').fn('DATE_FORMAT', require('sequelize').col('Subscription.purchase_date'), '%Y-%m'), 'ASC']],
            raw: true
        });

        res.status(200).json({
            success: true,
            data: {
                total_subscriptions: totalSubscriptions || 0,
                active_subscriptions: activeSubscriptions || 0,
                expired_subscriptions: expiredSubscriptions || 0,
                total_revenue: totalRevenue || 0,
                monthly_revenue: monthlyRevenue || 0,
                revenue_trend: revenueByMonth.map((r) => ({ month: r.month, revenue: parseFloat(r.revenue) || 0 }))
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
                    attributes: ['name']
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
                sub.testSeries?.name || 'N/A',
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
            pdf_category_uuid,
            transaction_id,
            payment_method,
            amount_paid,
            currency = 'INR',
            status = 'completed',
            expiry_date
        } = req.body;

        const isPdfCategory = !!pdf_category_uuid;
        const isTestSeries  = !!test_series_id;

        // Require exactly one of the two subscription targets
        if (!user_id || !transaction_id || amount_paid == null || (!isTestSeries && !isPdfCategory)) {
            return next(new ErrorHandler('Missing required fields: user_id, transaction_id, amount_paid, and one of test_series_id or pdf_category_uuid', 400));
        }

        // Check if user exists
        const user = await User.findOne({ where: { uuid: user_id } });
        if (!user) {
            return next(new ErrorHandler('User not found', 404));
        }

        let pdfCategory = null;
        if (isPdfCategory) {
            pdfCategory = await PdfCategory.findOne({ where: { uuid: pdf_category_uuid } });
            if (!pdfCategory) {
                return next(new ErrorHandler('PDF category not found', 404));
            }
        } else {
            const testSeries = await TestSeries.findByPk(test_series_id);
            if (!testSeries) {
                return next(new ErrorHandler('Test series not found', 404));
            }
        }

        // Check if transaction ID already exists
        const existingTransaction = await Subscription.findOne({ where: { transaction_id } });
        if (existingTransaction) {
            return next(new ErrorHandler('Transaction ID already exists', 400));
        }

        // Use provided expiry date or default to 365 days
        const DEFAULT_SUBSCRIPTION_DAYS = 365;
        let finalExpiryDate = null;
        if (expiry_date) {
            finalExpiryDate = new Date(expiry_date);
        } else {
            finalExpiryDate = new Date();
            finalExpiryDate.setDate(finalExpiryDate.getDate() + DEFAULT_SUBSCRIPTION_DAYS);
        }

        const subscriptionPayload = {
            user_id,
            test_series_id: isTestSeries ? test_series_id : null,
            transaction_id,
            payment_method,
            amount_paid,
            currency,
            status,
            purchase_date: new Date(),
            expiry_date: finalExpiryDate,
            metadata: isPdfCategory ? {
                plan_type: 'pdf_category',
                pdf_category_id: pdfCategory.id,
                pdf_category_uuid: pdfCategory.uuid,
            } : null,
        };

        const subscription = await Subscription.create(subscriptionPayload);

        // Update user's subscription status
        await updateUserSubscriptionStatus(user_id);

        const createdSubscription = await Subscription.findByPk(subscription.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['uuid', 'username', 'email']
                },
                ...(isTestSeries ? [{
                    model: TestSeries,
                    as: 'testSeries',
                    attributes: ['id', 'name', 'price']
                }] : [])
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