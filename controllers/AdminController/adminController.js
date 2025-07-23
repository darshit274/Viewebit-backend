const ErrorHandler = require('../../utils/default/errorHandler');
const { Admin, User, Subscription, Test_Series } = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Admin login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find admin by email
        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
            return next(new ErrorHandler('Invalid email or password', 401));
        }

        // Check if admin is active
        if (!admin.isActive) {
            return next(new ErrorHandler('Account is deactivated. Contact system administrator.', 403));
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return next(new ErrorHandler('Invalid email or password', 401));
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Generate JWT token
        const payload = { 
            id: admin.id, 
            email: admin.email, 
            role: admin.role 
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                admin: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    avatar: admin.avatar,
                    created_at: admin.created_at,
                    last_login: admin.lastLogin
                },
                token
            }
        });
    } catch (err) {
        console.error('Admin login error:', err);
        const error = new ErrorHandler('Login failed', 500);
        return next(error);
    }
};

// Get admin profile
exports.getProfile = async (req, res, next) => {
    try {
        const admin = await Admin.findByPk(req.admin.id, {
            attributes: ['id', 'name', 'email', 'role', 'avatar', 'created_at', 'lastLogin', 'permissions']
        });

        if (!admin) {
            return next(new ErrorHandler('Admin not found', 404));
        }

        res.status(200).json({
            success: true,
            data: admin
        });
    } catch (err) {
        console.error('Get admin profile error:', err);
        const error = new ErrorHandler('Failed to fetch profile', 500);
        return next(error);
    }
};

// Admin logout
exports.logout = async (req, res, next) => {
    try {
        // In a more complex setup, you might want to blacklist the token
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (err) {
        console.error('Admin logout error:', err);
        const error = new ErrorHandler('Logout failed', 500);
        return next(error);
    }
};

// Dashboard stats
exports.getDashboardStats = async (req, res, next) => {
    try {
        // Get total counts
        const totalStudents = await User.count();
        
        // Get counts from other models if they exist
        let totalTests = 0;
        let totalTestSeries = 0;
        let totalPDFs = 0;
        
        try {
            const { Test, Test_Series, Pdfs } = require('../../models');
            if (Test) totalTests = await Test.count();
            if (Test_Series) totalTestSeries = await Test_Series.count();
            if (Pdfs) totalPDFs = await Pdfs.count();
        } catch (modelError) {
            console.log('Some models not available:', modelError.message);
        }

        // Get today's data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const newRegistrationsToday = await User.count({
            where: {
                created_at: {
                    [require('sequelize').Op.gte]: today,
                    [require('sequelize').Op.lt]: tomorrow
                }
            }
        });

        const activeStudentsToday = await User.count({
            where: {
                lastLogin: {
                    [require('sequelize').Op.gte]: today,
                    [require('sequelize').Op.lt]: tomorrow
                }
            }
        });

        // Get subscription stats
        let totalSubscriptions = 0;
        let activeSubscriptions = 0;
        let totalRevenue = 0;
        
        try {
            totalSubscriptions = await Subscription.count({ where: { status: 'completed' } });
            activeSubscriptions = await Subscription.count({ 
                where: { 
                    status: 'completed',
                    [Op.or]: [
                        { expiry_date: null },
                        { expiry_date: { [Op.gt]: new Date() } }
                    ]
                } 
            });
            totalRevenue = await Subscription.sum('amount_paid', { where: { status: 'completed' } }) || 0;
        } catch (subError) {
            console.log('Subscription stats error:', subError.message);
        }

        const stats = {
            total_students: totalStudents,
            total_tests: totalTests,
            total_test_series: totalTestSeries,
            total_pdfs: totalPDFs,
            total_subscriptions: totalSubscriptions,
            active_subscriptions: activeSubscriptions,
            total_revenue: totalRevenue,
            monthly_revenue: 0, // Will be calculated from payment records
            active_students_today: activeStudentsToday,
            new_registrations_today: newRegistrationsToday,
            test_attempts_today: 0 // Will be implemented when test attempt models are added
        };

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        const error = new ErrorHandler('Failed to fetch dashboard stats', 500);
        return next(error);
    }
};

// Get all students with pagination
exports.getStudents = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        const offset = (page - 1) * limit;

        const whereClause = {};
        if (search) {
            whereClause[require('sequelize').Op.or] = [
                { username: { [require('sequelize').Op.iLike]: `%${search}%` } },
                { email: { [require('sequelize').Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            attributes: ['uuid', 'username', 'email', 'phone', 'profileImage', 'isEmailVerified', 'created_at'],
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
        console.error('Get students error:', err);
        const error = new ErrorHandler('Failed to fetch students', 500);
        return next(error);
    }
};

// Get single student by ID
exports.getStudentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const student = await User.findOne({
            where: { uuid: id },
            attributes: ['uuid', 'username', 'email', 'phone', 'profileImage', 'isEmailVerified', 'created_at', 'lastLogin']
        });

        if (!student) {
            return next(new ErrorHandler('Student not found', 404));
        }

        res.status(200).json({
            success: true,
            data: student
        });
    } catch (err) {
        console.error('Get student error:', err);
        const error = new ErrorHandler('Failed to fetch student', 500);
        return next(error);
    }
};

// Update student
exports.updateStudent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { username, email, phone, isEmailVerified } = req.body;

        const student = await User.findOne({ where: { uuid: id } });
        if (!student) {
            return next(new ErrorHandler('Student not found', 404));
        }

        // Check if email is already taken by another user
        if (email && email !== student.email) {
            const existingUser = await User.findOne({ 
                where: { 
                    email,
                    uuid: { [require('sequelize').Op.ne]: id }
                }
            });
            if (existingUser) {
                return next(new ErrorHandler('Email already exists', 400));
            }
        }

        // Check if username is already taken by another user
        if (username && username !== student.username) {
            const existingUser = await User.findOne({ 
                where: { 
                    username,
                    uuid: { [require('sequelize').Op.ne]: id }
                }
            });
            if (existingUser) {
                return next(new ErrorHandler('Username already exists', 400));
            }
        }

        // Update student
        await student.update({
            ...(username && { username }),
            ...(email && { email }),
            ...(phone !== undefined && { phone }),
            ...(isEmailVerified !== undefined && { isEmailVerified })
        });

        res.status(200).json({
            success: true,
            message: 'Student updated successfully',
            data: {
                uuid: student.uuid,
                username: student.username,
                email: student.email,
                phone: student.phone,
                isEmailVerified: student.isEmailVerified,
                created_at: student.created_at
            }
        });
    } catch (err) {
        console.error('Update student error:', err);
        const error = new ErrorHandler('Failed to update student', 500);
        return next(error);
    }
};

// Delete student
exports.deleteStudent = async (req, res, next) => {
    try {
        const { id } = req.params;

        const student = await User.findOne({ where: { uuid: id } });
        if (!student) {
            return next(new ErrorHandler('Student not found', 404));
        }

        await student.destroy();

        res.status(200).json({
            success: true,
            message: 'Student deleted successfully'
        });
    } catch (err) {
        console.error('Delete student error:', err);
        const error = new ErrorHandler('Failed to delete student', 500);
        return next(error);
    }
};

// Create new student (admin only)
exports.createStudent = async (req, res, next) => {
    try {
        const { username, email, password, phone } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return next(new ErrorHandler('Username, email and password are required', 400));
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            where: { 
                [require('sequelize').Op.or]: [
                    { email },
                    { username }
                ]
            }
        });
        
        if (existingUser) {
            return next(new ErrorHandler('User with this email or username already exists', 400));
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            phone: phone || null,
            isEmailVerified: true // Admin created users are auto-verified
        });

        res.status(201).json({
            success: true,
            message: 'Student created successfully',
            data: {
                uuid: newUser.uuid,
                username: newUser.username,
                email: newUser.email,
                phone: newUser.phone,
                isEmailVerified: newUser.isEmailVerified,
                created_at: newUser.created_at
            }
        });
    } catch (err) {
        console.error('Create student error:', err);
        const error = new ErrorHandler('Failed to create student', 500);
        return next(error);
    }
};

// Create new admin (super admin only)
exports.createAdmin = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if requesting admin has permission
        if (req.admin.role !== 'super_admin') {
            return next(new ErrorHandler('Access denied. Super admin role required.', 403));
        }

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ where: { email } });
        if (existingAdmin) {
            return next(new ErrorHandler('Admin with this email already exists', 400));
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin
        const newAdmin = await Admin.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'admin'
        });

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            data: {
                id: newAdmin.id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role,
                created_at: newAdmin.created_at
            }
        });
    } catch (err) {
        console.error('Create admin error:', err);
        const error = new ErrorHandler('Failed to create admin', 500);
        return next(error);
    }
};

// Analytics endpoints for dashboard
exports.getRegistrationAnalytics = async (req, res, next) => {
    try {
        const period = req.query.period || 'month';
        const { Op } = require('sequelize');
        
        let dateFormat, groupBy;
        let startDate = new Date();
        
        if (period === 'week') {
            startDate.setDate(startDate.getDate() - 7);
            dateFormat = '%Y-%m-%d';
            groupBy = 'DATE(created_at)';
        } else if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 6);
            dateFormat = '%Y-%m';
            groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
        } else {
            startDate.setFullYear(startDate.getFullYear() - 1);
            dateFormat = '%Y-%m';
            groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
        }

        const registrationData = await User.findAll({
            attributes: [
                [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('created_at'), dateFormat), 'name'],
                [require('sequelize').fn('COUNT', require('sequelize').col('uuid')), 'value']
            ],
            where: {
                created_at: {
                    [Op.gte]: startDate
                }
            },
            group: [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('created_at'), dateFormat)],
            order: [[require('sequelize').fn('DATE_FORMAT', require('sequelize').col('created_at'), dateFormat), 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: registrationData
        });
    } catch (err) {
        console.error('Registration analytics error:', err);
        const error = new ErrorHandler('Failed to fetch registration analytics', 500);
        return next(error);
    }
};

exports.getTestAttemptAnalytics = async (req, res, next) => {
    try {
        const period = req.query.period || 'week';
        const { Op } = require('sequelize');
        
        // Mock data for now since we don't have test attempt tracking yet
        const mockData = period === 'week' ? [
            { name: 'Mon', value: 45 },
            { name: 'Tue', value: 62 },
            { name: 'Wed', value: 78 },
            { name: 'Thu', value: 56 },
            { name: 'Fri', value: 89 },
            { name: 'Sat', value: 123 },
            { name: 'Sun', value: 67 }
        ] : [
            { name: 'Jan', value: 165 },
            { name: 'Feb', value: 289 },
            { name: 'Mar', value: 425 },
            { name: 'Apr', value: 356 },
            { name: 'May', value: 489 },
            { name: 'Jun', value: 623 }
        ];

        res.status(200).json({
            success: true,
            data: mockData
        });
    } catch (err) {
        console.error('Test attempt analytics error:', err);
        const error = new ErrorHandler('Failed to fetch test attempt analytics', 500);
        return next(error);
    }
};

exports.getCategoryAnalytics = async (req, res, next) => {
    try {
        // Mock data for now since we don't have test series data yet
        const categoryData = [
            { name: 'PSI Tests', value: 35 },
            { name: 'GPSC Tests', value: 25 },
            { name: 'NCERT Tests', value: 20 },
            { name: 'Other Tests', value: 20 }
        ];

        res.status(200).json({
            success: true,
            data: categoryData
        });
    } catch (err) {
        console.error('Category analytics error:', err);
        const error = new ErrorHandler('Failed to fetch category analytics', 500);
        return next(error);
    }
};

exports.getRecentActivity = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const { Op } = require('sequelize');

        // Get recent user registrations
        const recentUsers = await User.findAll({
            attributes: ['username', 'email', 'created_at'],
            order: [['created_at', 'DESC']],
            limit: limit
        });

        // Format activity data
        const activities = recentUsers.map(user => ({
            action: 'New student registered',
            user: user.email,
            time: getRelativeTime(user.created_at),
            type: 'user'
        }));

        res.status(200).json({
            success: true,
            data: activities
        });
    } catch (err) {
        console.error('Recent activity error:', err);
        const error = new ErrorHandler('Failed to fetch recent activity', 500);
        return next(error);
    }
};

// Helper function for relative time
const getRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
};