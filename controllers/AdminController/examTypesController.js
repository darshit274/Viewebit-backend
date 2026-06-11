const ErrorHandler = require('../../utils/default/errorHandler');
const { ExamType } = require('../../models');
const { Op } = require('sequelize');

// Get all exam types with pagination and search
exports.getExamTypes = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        const offset = (page - 1) * limit;

        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { code: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await ExamType.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [[sortBy, sortOrder]]
        });

        // Add mock counts for now (will be updated when other models are ready)
        const examTypesWithCounts = rows.map(examType => {
            const examTypeData = examType.toJSON();
            return {
                ...examTypeData,
                testSeriesCount: 0,
                pyqCount: 0
            };
        });

        res.status(200).json({
            success: true,
            data: examTypesWithCounts,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        console.error('Get exam types error:', err);
        const error = new ErrorHandler('Failed to fetch exam types', 500);
        return next(error);
    }
};

// Get single exam type by ID
exports.getExamTypeById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const examType = await ExamType.findByPk(id);

        if (!examType) {
            return next(new ErrorHandler('Exam type not found', 404));
        }

        res.status(200).json({
            success: true,
            data: examType
        });
    } catch (err) {
        console.error('Get exam type by ID error:', err);
        const error = new ErrorHandler('Failed to fetch exam type', 500);
        return next(error);
    }
};

// Create new exam type
exports.createExamType = async (req, res, next) => {
    try {
        const { name, code, description, is_active = true } = req.body;

        // Validate required fields
        if (!name || !code) {
            return next(new ErrorHandler('Name and code are required', 400));
        }

        // Check if exam type with same name or code exists
        const existingExamType = await ExamType.findOne({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: name } },
                    { code: { [Op.like]: code } }
                ]
            }
        });

        if (existingExamType) {
            return next(new ErrorHandler('Exam type with this name or code already exists', 400));
        }

        const examType = await ExamType.create({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description?.trim(),
            is_active
        });

        res.status(201).json({
            success: true,
            message: 'Exam type created successfully',
            data: examType
        });
    } catch (err) {
        console.error('Create exam type error:', err);
        const error = new ErrorHandler('Failed to create exam type', 500);
        return next(error);
    }
};

// Update exam type
exports.updateExamType = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, code, description, is_active } = req.body;

        const examType = await ExamType.findByPk(id);
        if (!examType) {
            return next(new ErrorHandler('Exam type not found', 404));
        }

        // Check if name or code is being changed and already exists
        if ((name && name !== examType.name) || (code && code !== examType.code)) {
            const existingExamType = await ExamType.findOne({
                where: {
                    id: { [Op.ne]: id },
                    [Op.or]: [
                        ...(name ? [{ name: { [Op.like]: name } }] : []),
                        ...(code ? [{ code: { [Op.like]: code } }] : [])
                    ]
                }
            });

            if (existingExamType) {
                return next(new ErrorHandler('Exam type with this name or code already exists', 400));
            }
        }

        await examType.update({
            ...(name && { name: name.trim() }),
            ...(code && { code: code.trim().toUpperCase() }),
            ...(description !== undefined && { description: description?.trim() }),
            ...(is_active !== undefined && { is_active })
        });

        res.status(200).json({
            success: true,
            message: 'Exam type updated successfully',
            data: examType
        });
    } catch (err) {
        console.error('Update exam type error:', err);
        const error = new ErrorHandler('Failed to update exam type', 500);
        return next(error);
    }
};

// Delete exam type
exports.deleteExamType = async (req, res, next) => {
    try {
        const { id } = req.params;

        const examType = await ExamType.findByPk(id);
        if (!examType) {
            return next(new ErrorHandler('Exam type not found', 404));
        }

        // For now, allow deletion (will add checks when other models are implemented)
        // TODO: Add checks for associated test series and PYQs

        await examType.destroy();

        res.status(200).json({
            success: true,
            message: 'Exam type deleted successfully'
        });
    } catch (err) {
        console.error('Delete exam type error:', err);
        const error = new ErrorHandler('Failed to delete exam type', 500);
        return next(error);
    }
};

// Get exam types for dropdown (active only)
exports.getExamTypesForDropdown = async (req, res, next) => {
    try {
        const examTypes = await ExamType.findAll({
            where: { is_active: true },
            attributes: ['id', 'name', 'code'],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: examTypes
        });
    } catch (err) {
        console.error('Get exam types for dropdown error:', err);
        const error = new ErrorHandler('Failed to fetch exam types', 500);
        return next(error);
    }
};