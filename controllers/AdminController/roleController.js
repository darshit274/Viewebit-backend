const ErrorHandler = require('../../utils/default/errorHandler');
const { Admin, Institution, Branch, Department } = require('../../models');
const { Op } = require('sequelize');

const ADMIN_ROLES = ['super_admin', 'admin', 'moderator', 'institution_admin', 'branch_admin'];

// List admins with their role/permissions (this is the "Roles & Permissions" screen's data source)
exports.getAdmins = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (req.query.role) whereClause.role = req.query.role;
        if (req.query.branch_id) whereClause.branch_id = req.query.branch_id;
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Admin.findAndCountAll({
            where: whereClause,
            attributes: ['id', 'name', 'email', 'role', 'permissions', 'isActive', 'institution_id', 'branch_id', 'department_id', 'created_at'],
            include: [
                { model: Institution, as: 'institution', attributes: ['id', 'name'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: Department, as: 'department', attributes: ['id', 'name'] }
            ],
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: rows,
            roles: ADMIN_ROLES,
            pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
        });
    } catch (err) {
        console.error('Get admins (roles) error:', err);
        return next(new ErrorHandler('Failed to fetch admins', 500));
    }
};

// Update an admin's role, permissions JSON, and/or org scoping — super_admin only
exports.updateAdminRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role, permissions, institution_id, branch_id, department_id } = req.body;

        if (req.admin.role !== 'super_admin') {
            return next(new ErrorHandler('Access denied. Super admin role required.', 403));
        }

        if (role && !ADMIN_ROLES.includes(role)) {
            return next(new ErrorHandler('Invalid role', 400));
        }

        const admin = await Admin.findByPk(id);
        if (!admin) return next(new ErrorHandler('Admin not found', 404));

        await admin.update({
            ...(role !== undefined && { role }),
            ...(permissions !== undefined && { permissions }),
            ...(institution_id !== undefined && { institution_id }),
            ...(branch_id !== undefined && { branch_id }),
            ...(department_id !== undefined && { department_id })
        });

        res.status(200).json({
            success: true,
            message: 'Admin role updated successfully',
            data: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions
            }
        });
    } catch (err) {
        console.error('Update admin role error:', err);
        return next(new ErrorHandler('Failed to update admin role', 500));
    }
};

exports.getAvailableRoles = async (req, res, next) => {
    res.status(200).json({ success: true, data: ADMIN_ROLES });
};
