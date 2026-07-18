const ErrorHandler = require('../../utils/default/errorHandler');
const { Branch, Institution, Department } = require('../../models');
const { Op } = require('sequelize');

exports.getBranches = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (req.query.institution_id) whereClause.institution_id = req.query.institution_id;
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { code: { [Op.like]: `%${search}%` } },
                { city: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Branch.findAndCountAll({
            where: whereClause,
            include: [
                { model: Institution, as: 'institution', attributes: ['id', 'uuid', 'name'] },
                { model: Department, as: 'departments', attributes: ['id', 'uuid', 'name'] }
            ],
            limit,
            offset,
            order: [['display_order', 'ASC'], ['created_at', 'DESC']],
            distinct: true
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
        });
    } catch (err) {
        console.error('Get branches error:', err);
        return next(new ErrorHandler('Failed to fetch branches', 500));
    }
};

exports.getBranchById = async (req, res, next) => {
    try {
        const branch = await Branch.findOne({
            where: { uuid: req.params.id },
            include: [
                { model: Institution, as: 'institution' },
                { model: Department, as: 'departments' }
            ]
        });
        if (!branch) return next(new ErrorHandler('Branch not found', 404));
        res.status(200).json({ success: true, data: branch });
    } catch (err) {
        console.error('Get branch by ID error:', err);
        return next(new ErrorHandler('Failed to fetch branch', 500));
    }
};

exports.createBranch = async (req, res, next) => {
    try {
        const { institution_id, name, code, address, city, state, is_active = true, display_order = 0 } = req.body;
        if (!institution_id || !name) {
            return next(new ErrorHandler('Institution and name are required', 400));
        }

        const institution = await Institution.findByPk(institution_id);
        if (!institution) return next(new ErrorHandler('Institution not found', 404));

        const branch = await Branch.create({ institution_id, name, code, address, city, state, is_active, display_order });
        res.status(201).json({ success: true, message: 'Branch created successfully', data: branch });
    } catch (err) {
        console.error('Create branch error:', err);
        return next(new ErrorHandler('Failed to create branch', 500));
    }
};

exports.updateBranch = async (req, res, next) => {
    try {
        const branch = await Branch.findOne({ where: { uuid: req.params.id } });
        if (!branch) return next(new ErrorHandler('Branch not found', 404));

        const { name, code, address, city, state, is_active, display_order } = req.body;
        await branch.update({
            ...(name !== undefined && { name }),
            ...(code !== undefined && { code }),
            ...(address !== undefined && { address }),
            ...(city !== undefined && { city }),
            ...(state !== undefined && { state }),
            ...(is_active !== undefined && { is_active }),
            ...(display_order !== undefined && { display_order })
        });

        res.status(200).json({ success: true, message: 'Branch updated successfully', data: branch });
    } catch (err) {
        console.error('Update branch error:', err);
        return next(new ErrorHandler('Failed to update branch', 500));
    }
};

exports.deleteBranch = async (req, res, next) => {
    try {
        const branch = await Branch.findOne({ where: { uuid: req.params.id } });
        if (!branch) return next(new ErrorHandler('Branch not found', 404));

        const departmentCount = await Department.count({ where: { branch_id: branch.id } });
        if (departmentCount > 0) {
            return next(new ErrorHandler('Cannot delete a branch that still has departments', 400));
        }

        await branch.destroy();
        res.status(200).json({ success: true, message: 'Branch deleted successfully' });
    } catch (err) {
        console.error('Delete branch error:', err);
        return next(new ErrorHandler('Failed to delete branch', 500));
    }
};

exports.toggleBranchStatus = async (req, res, next) => {
    try {
        const branch = await Branch.findOne({ where: { uuid: req.params.id } });
        if (!branch) return next(new ErrorHandler('Branch not found', 404));

        branch.is_active = !branch.is_active;
        await branch.save();

        res.status(200).json({ success: true, message: `Branch ${branch.is_active ? 'activated' : 'deactivated'} successfully`, data: branch });
    } catch (err) {
        console.error('Toggle branch status error:', err);
        return next(new ErrorHandler('Failed to toggle branch status', 500));
    }
};

exports.getBranchesForDropdown = async (req, res, next) => {
    try {
        const whereClause = { is_active: true };
        if (req.query.institution_id) whereClause.institution_id = req.query.institution_id;

        const branches = await Branch.findAll({
            where: whereClause,
            attributes: ['id', 'uuid', 'name'],
            order: [['name', 'ASC']]
        });
        res.status(200).json({ success: true, data: branches });
    } catch (err) {
        console.error('Get branches dropdown error:', err);
        return next(new ErrorHandler('Failed to fetch branches', 500));
    }
};
