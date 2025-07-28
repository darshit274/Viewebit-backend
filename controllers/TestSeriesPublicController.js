const ErrorHandler = require('../utils/default/errorHandler');
const { NewTestSeries, TestSeriesCategory, Subscription, User } = require('../models');
const { Op } = require('sequelize');

// Get all test series with pagination and filters (Public endpoint)
exports.getTestSeries = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const exam_type = req.query.exam_type || '';
        const price_min = parseFloat(req.query.price_min) || 0;
        const price_max = parseFloat(req.query.price_max) || 999999;
        const difficulty = req.query.difficulty || '';
        const language = req.query.language || '';
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';
        const is_featured = req.query.is_featured;

        const offset = (page - 1) * limit;

        const whereClause = { is_active: true };
        
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }
        
        if (category) {
            whereClause.category = category;
        }
        
        if (exam_type) {
            whereClause.exam_type = exam_type;
        }
        
        if (price_min || price_max) {
            whereClause.price = {
                [Op.between]: [price_min, price_max]
            };
        }
        
        if (difficulty) {
            whereClause.difficulty = difficulty;
        }
        
        if (language) {
            whereClause.language = language;
        }
        
        if (is_featured !== undefined) {
            whereClause.is_featured = is_featured === 'true';
        }

        const { count, rows } = await NewTestSeries.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            attributes: [
                'uuid', 'title', 'description', 'category', 'exam_type',
                'price', 'original_price', 'total_tests', 'free_tests',
                'duration_months', 'difficulty', 'language', 'is_featured',
                'negative_marking', 'negative_marks', 'pass_percentage',
                'created_at', 'instructions'
            ]
        });

        // For each test series, we need to check if the current user has purchased it
        // Since this is a public endpoint, we'll set is_purchased to false by default
        const transformedData = rows.map(series => ({
            id: series.uuid,
            title: series.title,
            description: series.description,
            category: series.category,
            exam_type: series.exam_type,
            price: series.price,
            original_price: series.original_price,
            total_tests: series.total_tests,
            free_tests: series.free_tests,
            duration_months: series.duration_months,
            difficulty: series.difficulty || 'mixed',
            language: series.language || 'English',
            instructions: series.instructions,
            is_active: true,
            is_featured: series.is_featured,
            negative_marking: series.negative_marking,
            negative_marks: series.negative_marks,
            pass_percentage: series.pass_percentage,
            created_at: series.created_at,
            purchase_count: 0, // Would need to calculate from subscriptions
            rating: 0, // Would need a ratings system
            rating_count: 0,
            topics: [], // Would need a topics system
            is_purchased: false, // Default for public endpoint
            purchased_at: null,
            expires_at: null
        }));

        res.status(200).json({
            success: true,
            data: transformedData,
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

        const series = await NewTestSeries.findOne({
            where: { uuid: id, is_active: true }
        });

        if (!series) {
            return next(new ErrorHandler('Test series not found', 404));
        }

        const transformedData = {
            id: series.uuid,
            title: series.title,
            description: series.description,
            category: series.category,
            exam_type: series.exam_type,
            price: series.price,
            original_price: series.original_price,
            total_tests: series.total_tests,
            free_tests: series.free_tests,
            duration_months: series.duration_months,
            difficulty: series.difficulty || 'mixed',
            language: series.language || 'English',
            instructions: series.instructions,
            is_active: series.is_active,
            is_featured: series.is_featured,
            negative_marking: series.negative_marking,
            negative_marks: series.negative_marks,
            pass_percentage: series.pass_percentage,
            created_at: series.created_at,
            purchase_count: 0,
            rating: 0,
            rating_count: 0,
            topics: [],
            is_purchased: false,
            purchased_at: null,
            expires_at: null
        };

        res.status(200).json({
            success: true,
            data: transformedData
        });
    } catch (err) {
        console.error('Get test series by ID error:', err);
        const error = new ErrorHandler('Failed to fetch test series', 500);
        return next(error);
    }
};

// Get test series categories
exports.getTestSeriesCategories = async (req, res, next) => {
    try {
        // Try to get from TestSeriesCategory model first
        let categories = await TestSeriesCategory.findAll({
            where: { is_active: true },
            attributes: ['uuid', 'name', 'description', 'icon']
        });

        // If no categories found, get unique categories from test series
        if (categories.length === 0) {
            const uniqueCategories = await NewTestSeries.findAll({
                where: { is_active: true },
                attributes: ['category'],
                group: ['category'],
                raw: true
            });

            categories = uniqueCategories.map(cat => ({
                id: cat.category,
                name: cat.category,
                description: `${cat.category} test series`,
                icon: null,
                is_active: true,
                series_count: 0
            }));
        } else {
            categories = categories.map(cat => ({
                id: cat.uuid,
                name: cat.name,
                description: cat.description,
                icon: cat.icon,
                is_active: true,
                series_count: 0
            }));
        }

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (err) {
        console.error('Get test series categories error:', err);
        const error = new ErrorHandler('Failed to fetch categories', 500);
        return next(error);
    }
};

// Get test series statistics
exports.getTestSeriesStats = async (req, res, next) => {
    try {
        const totalSeries = await NewTestSeries.count({
            where: { is_active: true }
        });

        const featuredSeries = await NewTestSeries.count({
            where: { is_active: true, is_featured: true }
        });

        // Get price range
        const priceStats = await NewTestSeries.findAll({
            where: { is_active: true },
            attributes: [
                [require('sequelize').fn('MIN', require('sequelize').col('price')), 'min_price'],
                [require('sequelize').fn('MAX', require('sequelize').col('price')), 'max_price'],
                [require('sequelize').fn('AVG', require('sequelize').col('price')), 'avg_price']
            ],
            raw: true
        });

        res.status(200).json({
            success: true,
            data: {
                total_series: totalSeries,
                purchased_series: 0, // Would need user context
                featured_series: featuredSeries,
                total_tests: 0, // Would need to sum from all series
                completed_tests: 0, // Would need user data
                average_score: 0, // Would need user score data
                category_stats: [],
                price_range: {
                    min: priceStats[0]?.min_price || 0,
                    max: priceStats[0]?.max_price || 0,
                    average: parseFloat(priceStats[0]?.avg_price) || 0
                }
            }
        });
    } catch (err) {
        console.error('Get test series stats error:', err);
        const error = new ErrorHandler('Failed to fetch stats', 500);
        return next(error);
    }
};

// Get tests in a specific test series
exports.getSeriesTests = async (req, res, next) => {
    try {
        const { seriesId } = req.params;

        const series = await NewTestSeries.findOne({
            where: { uuid: seriesId, is_active: true }
        });

        if (!series) {
            return next(new ErrorHandler('Test series not found', 404));
        }

        // This would need a proper Test model and relationship
        // For now, return mock data structure
        const tests = [];

        res.status(200).json({
            success: true,
            data: tests
        });
    } catch (err) {
        console.error('Get series tests error:', err);
        const error = new ErrorHandler('Failed to fetch tests', 500);
        return next(error);
    }
};