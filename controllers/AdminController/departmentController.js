const ErrorHandler = require('../../utils/default/errorHandler');
const { Department, Branch } = require('../../models');
const { Op } = require('sequelize');

exports.getDepartments = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (req.query.branch_id) whereClause.branch_id = req.query.branch_id;
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { code: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Department.findAndCountAll({
            where: whereClause,
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'uuid', 'name'] }],
            limit,
            offset,
            order: [['display_order', 'ASC'], ['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
        });
    } catch (err) {
        console.error('Get departments error:', err);
        return next(new ErrorHandler('Failed to fetch departments', 500));
    }
};

exports.getDepartmentById = async (req, res, next) => {
    try {
        const department = await Department.findOne({
            where: { uuid: req.params.id },
            include: [{ model: Branch, as: 'branch' }]
        });
        if (!department) return next(new ErrorHandler('Department not found', 404));
        res.status(200).json({ success: true, data: department });
    } catch (err) {
        console.error('Get department by ID error:', err);
        return next(new ErrorHandler('Failed to fetch department', 500));
    }
};

exports.createDepartment = async (req, res, next) => {
    try {
        const { branch_id, name, code, is_active = true, display_order = 0 } = req.body;
        if (!branch_id || !name) {
            return next(new ErrorHandler('Branch and name are required', 400));
        }

        const branch = await Branch.findByPk(branch_id);
        if (!branch) return next(new ErrorHandler('Branch not found', 404));

        const department = await Department.create({ branch_id, name, code, is_active, display_order });
        res.status(201).json({ success: true, message: 'Department created successfully', data: department });
    } catch (err) {
        console.error('Create department error:', err);
        return next(new ErrorHandler('Failed to create department', 500));
    }
};

exports.updateDepartment = async (req, res, next) => {
    try {
        const department = await Department.findOne({ where: { uuid: req.params.id } });
        if (!department) return next(new ErrorHandler('Department not found', 404));

        const { name, code, is_active, display_order } = req.body;
        await department.update({
            ...(name !== undefined && { name }),
            ...(code !== undefined && { code }),
            ...(is_active !== undefined && { is_active }),
            ...(display_order !== undefined && { display_order })
        });

        res.status(200).json({ success: true, message: 'Department updated successfully', data: department });
    } catch (err) {
        console.error('Update department error:', err);
        return next(new ErrorHandler('Failed to update department', 500));
    }
};

exports.deleteDepartment = async (req, res, next) => {
    try {
        const department = await Department.findOne({ where: { uuid: req.params.id } });
        if (!department) return next(new ErrorHandler('Department not found', 404));

        await department.destroy();
        res.status(200).json({ success: true, message: 'Department deleted successfully' });
    } catch (err) {
        console.error('Delete department error:', err);
        return next(new ErrorHandler('Failed to delete department', 500));
    }
};

exports.toggleDepartmentStatus = async (req, res, next) => {
    try {
        const department = await Department.findOne({ where: { uuid: req.params.id } });
        if (!department) return next(new ErrorHandler('Department not found', 404));

        department.is_active = !department.is_active;
        await department.save();

        res.status(200).json({ success: true, message: `Department ${department.is_active ? 'activated' : 'deactivated'} successfully`, data: department });
    } catch (err) {
        console.error('Toggle department status error:', err);
        return next(new ErrorHandler('Failed to toggle department status', 500));
    }
};

exports.getDepartmentsForDropdown = async (req, res, next) => {
    try {
        const whereClause = { is_active: true };
        if (req.query.branch_id) whereClause.branch_id = req.query.branch_id;

        const departments = await Department.findAll({
            where: whereClause,
            attributes: ['id', 'uuid', 'name'],
            order: [['name', 'ASC']]
        });
        res.status(200).json({ success: true, data: departments });
    } catch (err) {
        console.error('Get departments dropdown error:', err);
        return next(new ErrorHandler('Failed to fetch departments', 500));
    }
};
