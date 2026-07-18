const ErrorHandler = require('../../utils/default/errorHandler');
const { Educator, Institution, Branch, Department } = require('../../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

exports.getEducators = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (req.query.branch_id) whereClause.branch_id = req.query.branch_id;
        if (req.query.department_id) whereClause.department_id = req.query.department_id;
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { employee_code: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Educator.findAndCountAll({
            where: whereClause,
            attributes: { exclude: ['password', 'otp', 'otpExpiry', 'current_session_id'] },
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
            pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
        });
    } catch (err) {
        console.error('Get educators error:', err);
        return next(new ErrorHandler('Failed to fetch educators', 500));
    }
};

exports.getEducatorById = async (req, res, next) => {
    try {
        const educator = await Educator.findByPk(req.params.id, {
            attributes: { exclude: ['password', 'otp', 'otpExpiry', 'current_session_id'] }
        });
        if (!educator) return next(new ErrorHandler('Educator not found', 404));
        res.status(200).json({ success: true, data: educator });
    } catch (err) {
        console.error('Get educator by ID error:', err);
        return next(new ErrorHandler('Failed to fetch educator', 500));
    }
};

exports.createEducator = async (req, res, next) => {
    try {
        const { name, email, password, institution_id, branch_id, department_id, designation, employee_code, bio } = req.body;

        if (!name || !email || !password) {
            return next(new ErrorHandler('Name, email and password are required', 400));
        }

        const existing = await Educator.findOne({ where: { email } });
        if (existing) {
            return next(new ErrorHandler('Educator with this email already exists', 400));
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const educator = await Educator.create({
            name, email, password: hashedPassword,
            institution_id, branch_id, department_id, designation, employee_code, bio
        });

        res.status(201).json({
            success: true,
            message: 'Educator created successfully',
            data: {
                id: educator.id,
                name: educator.name,
                email: educator.email,
                institution_id: educator.institution_id,
                branch_id: educator.branch_id,
                department_id: educator.department_id
            }
        });
    } catch (err) {
        console.error('Create educator error:', err);
        return next(new ErrorHandler('Failed to create educator', 500));
    }
};

exports.updateEducator = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, institution_id, branch_id, department_id, designation, employee_code, bio, avatar } = req.body;

        const educator = await Educator.findByPk(id);
        if (!educator) return next(new ErrorHandler('Educator not found', 404));

        if (email && email !== educator.email) {
            const existing = await Educator.findOne({ where: { email, id: { [Op.ne]: id } } });
            if (existing) return next(new ErrorHandler('Email already in use by another educator', 400));
        }

        await educator.update({
            ...(name !== undefined && { name }),
            ...(email !== undefined && { email }),
            ...(institution_id !== undefined && { institution_id }),
            ...(branch_id !== undefined && { branch_id }),
            ...(department_id !== undefined && { department_id }),
            ...(designation !== undefined && { designation }),
            ...(employee_code !== undefined && { employee_code }),
            ...(bio !== undefined && { bio }),
            ...(avatar !== undefined && { avatar })
        });

        res.status(200).json({ success: true, message: 'Educator updated successfully', data: educator });
    } catch (err) {
        console.error('Update educator error:', err);
        return next(new ErrorHandler('Failed to update educator', 500));
    }
};

exports.deactivateEducator = async (req, res, next) => {
    try {
        const educator = await Educator.findByPk(req.params.id);
        if (!educator) return next(new ErrorHandler('Educator not found', 404));

        educator.isActive = !educator.isActive;
        await educator.save();

        res.status(200).json({
            success: true,
            message: `Educator ${educator.isActive ? 'activated' : 'deactivated'} successfully`,
            data: { id: educator.id, isActive: educator.isActive }
        });
    } catch (err) {
        console.error('Toggle educator status error:', err);
        return next(new ErrorHandler('Failed to toggle educator status', 500));
    }
};
