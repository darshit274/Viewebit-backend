const ErrorHandler = require('../../utils/default/errorHandler');
const { ExamCategory } = require('../../models');
const { Op } = require('sequelize');

// Get all categories with pagination and filters
exports.getCategories = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const parent_id = req.query.parent_id || null;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        const offset = (page - 1) * limit;

        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await ExamCategory.findAndCountAll({
            where: whereClause,
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
    } catch (error) {
        next(new ErrorHandler('Error fetching categories', 500));
    }
};

// Get category by ID
exports.getCategoryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const category = await ExamCategory.findByPk(id);
        
        if (!category) {
            return next(new ErrorHandler('Category not found', 404));
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        next(new ErrorHandler('Error fetching category', 500));
    }
};

// Create new category
exports.createCategory = async (req, res, next) => {
    try {
        const { name, type = 'topic_wise', description, is_active = true } = req.body;

        if (!name) {
            return next(new ErrorHandler('Category name is required', 400));
        }

        const category = await ExamCategory.create({
            name,
            type,
            description,
            is_active
        });

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return next(new ErrorHandler('Category name already exists', 400));
        }
        next(new ErrorHandler('Error creating category', 500));
    }
};

// Update category
exports.updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const category = await ExamCategory.findByPk(id);
        
        if (!category) {
            return next(new ErrorHandler('Category not found', 404));
        }

        await category.update(updates);

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category
        });
    } catch (error) {
        next(new ErrorHandler('Error updating category', 500));
    }
};

// Delete category
exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const category = await ExamCategory.findByPk(id);
        
        if (!category) {
            return next(new ErrorHandler('Category not found', 404));
        }

        await category.destroy();

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        next(new ErrorHandler('Error deleting category', 500));
    }
};

// Toggle category status
exports.toggleCategoryStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const category = await ExamCategory.findByPk(id);
        
        if (!category) {
            return next(new ErrorHandler('Category not found', 404));
        }

        category.is_active = !category.is_active;
        await category.save();

        res.status(200).json({
            success: true,
            message: `Category ${category.is_active ? 'activated' : 'deactivated'} successfully`,
            data: category
        });
    } catch (error) {
        next(new ErrorHandler('Error toggling category status', 500));
    }
};

// Get category statistics
exports.getCategoryStats = async (req, res, next) => {
    try {
        const totalCategories = await ExamCategory.count();
        const activeCategories = await ExamCategory.count({
            where: { is_active: true }
        });
        const parentCategories = await ExamCategory.count({
            where: { type: 'exam_wise' }
        });

        res.status(200).json({
            success: true,
            data: {
                total_categories: totalCategories,
                active_categories: activeCategories,
                parent_categories: parentCategories,
                total_items: 0 // This would need to be calculated based on related test series
            }
        });
    } catch (error) {
        next(new ErrorHandler('Error fetching category statistics', 500));
    }
};

// Get categories for dropdown
exports.getCategoriesForDropdown = async (req, res, next) => {
    try {
        const categories = await ExamCategory.findAll({
            where: { is_active: true },
            attributes: ['id', 'name', 'type'],
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        next(new ErrorHandler('Error fetching categories for dropdown', 500));
    }
};