const ErrorHandler = require('../../utils/default/errorHandler');
const { Institution, Branch } = require('../../models');
const { Op } = require('sequelize');

exports.getInstitutions = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { slug: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Institution.findAndCountAll({
            where: whereClause,
            include: [{ model: Branch, as: 'branches', attributes: ['id', 'uuid', 'name'] }],
            limit,
            offset,
            order: [['created_at', 'DESC']],
            distinct: true
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
        });
    } catch (err) {
        console.error('Get institutions error:', err);
        return next(new ErrorHandler('Failed to fetch institutions', 500));
    }
};

exports.getInstitutionById = async (req, res, next) => {
    try {
        const institution = await Institution.findByPk(req.params.id, {
            include: [{ model: Branch, as: 'branches' }]
        });
        if (!institution) return next(new ErrorHandler('Institution not found', 404));
        res.status(200).json({ success: true, data: institution });
    } catch (err) {
        console.error('Get institution by ID error:', err);
        return next(new ErrorHandler('Failed to fetch institution', 500));
    }
};

exports.createInstitution = async (req, res, next) => {
    try {
        const { name, slug, logo_url, contact_email, is_active = true } = req.body;
        if (!name || !slug) {
            return next(new ErrorHandler('Name and slug are required', 400));
        }

        const existing = await Institution.findOne({ where: { slug } });
        if (existing) {
            return next(new ErrorHandler('Institution with this slug already exists', 400));
        }

        const institution = await Institution.create({ name, slug, logo_url, contact_email, is_active });
        res.status(201).json({ success: true, message: 'Institution created successfully', data: institution });
    } catch (err) {
        console.error('Create institution error:', err);
        return next(new ErrorHandler('Failed to create institution', 500));
    }
};

exports.updateInstitution = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, slug, logo_url, contact_email, is_active } = req.body;

        const institution = await Institution.findByPk(id);
        if (!institution) return next(new ErrorHandler('Institution not found', 404));

        if (slug && slug !== institution.slug) {
            const existing = await Institution.findOne({ where: { slug, id: { [Op.ne]: id } } });
            if (existing) return next(new ErrorHandler('Institution with this slug already exists', 400));
        }

        await institution.update({
            ...(name !== undefined && { name }),
            ...(slug !== undefined && { slug }),
            ...(logo_url !== undefined && { logo_url }),
            ...(contact_email !== undefined && { contact_email }),
            ...(is_active !== undefined && { is_active })
        });

        res.status(200).json({ success: true, message: 'Institution updated successfully', data: institution });
    } catch (err) {
        console.error('Update institution error:', err);
        return next(new ErrorHandler('Failed to update institution', 500));
    }
};

exports.deleteInstitution = async (req, res, next) => {
    try {
        const institution = await Institution.findByPk(req.params.id);
        if (!institution) return next(new ErrorHandler('Institution not found', 404));

        const branchCount = await Branch.count({ where: { institution_id: institution.id } });
        if (branchCount > 0) {
            return next(new ErrorHandler('Cannot delete an institution that still has branches', 400));
        }

        await institution.destroy();
        res.status(200).json({ success: true, message: 'Institution deleted successfully' });
    } catch (err) {
        console.error('Delete institution error:', err);
        return next(new ErrorHandler('Failed to delete institution', 500));
    }
};

exports.getInstitutionsForDropdown = async (req, res, next) => {
    try {
        const institutions = await Institution.findAll({
            where: { is_active: true },
            attributes: ['id', 'uuid', 'name'],
            order: [['name', 'ASC']]
        });
        res.status(200).json({ success: true, data: institutions });
    } catch (err) {
        console.error('Get institutions dropdown error:', err);
        return next(new ErrorHandler('Failed to fetch institutions', 500));
    }
};
