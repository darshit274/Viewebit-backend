const ErrorHandler = require('../../utils/default/errorHandler');
const { User, Branch, Department } = require('../../models');
const { Op } = require('sequelize');

// Admissions & Enrollments — reuses the existing User model (extended in
// Phase 0 with application_status/applied_at/branch_id/department_id) rather
// than a separate applicant entity.
exports.getAdmissions = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (req.query.status && req.query.status !== 'all') {
            whereClause.application_status = req.query.status;
        }
        if (req.query.branch_id) whereClause.branch_id = req.query.branch_id;
        if (req.query.department_id) whereClause.department_id = req.query.department_id;
        if (search) {
            whereClause[Op.or] = [
                { username: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            attributes: ['uuid', 'username', 'email', 'phone', 'application_status', 'applied_at', 'branch_id', 'department_id', 'created_at'],
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: Department, as: 'department', attributes: ['id', 'name'] }
            ],
            limit,
            offset,
            order: [['applied_at', 'DESC'], ['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
        });
    } catch (err) {
        console.error('Get admissions error:', err);
        return next(new ErrorHandler('Failed to fetch admissions', 500));
    }
};

exports.updateAdmissionStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, branch_id, department_id } = req.body;

        if (!['pending', 'approved', 'rejected', 'enrolled'].includes(status)) {
            return next(new ErrorHandler('Invalid application status', 400));
        }

        const user = await User.findOne({ where: { uuid: id } });
        if (!user) return next(new ErrorHandler('Student not found', 404));

        await user.update({
            application_status: status,
            ...(branch_id !== undefined && { branch_id }),
            ...(department_id !== undefined && { department_id })
        });

        res.status(200).json({
            success: true,
            message: `Application ${status}`,
            data: { uuid: user.uuid, application_status: user.application_status }
        });
    } catch (err) {
        console.error('Update admission status error:', err);
        return next(new ErrorHandler('Failed to update admission status', 500));
    }
};

exports.getAdmissionStats = async (req, res, next) => {
    try {
        const [pending, approved, rejected, enrolled] = await Promise.all([
            User.count({ where: { application_status: 'pending' } }),
            User.count({ where: { application_status: 'approved' } }),
            User.count({ where: { application_status: 'rejected' } }),
            User.count({ where: { application_status: 'enrolled' } })
        ]);

        res.status(200).json({
            success: true,
            data: { pending, approved, rejected, enrolled, total: pending + approved + rejected + enrolled }
        });
    } catch (err) {
        console.error('Get admission stats error:', err);
        return next(new ErrorHandler('Failed to fetch admission stats', 500));
    }
};
