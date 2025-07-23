const ErrorHandler = require('../../utils/default/errorHandler');
const { Pdfs, User } = require('../../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Get all PDFs with pagination and filters
exports.getPdfs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const subject = req.query.subject || '';
        const is_free = req.query.is_free;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        const offset = (page - 1) * limit;

        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (category) {
            whereClause.category = category;
        }
        if (subject) {
            whereClause.subject = subject;
        }
        if (is_free !== undefined) {
            whereClause.is_free = is_free === 'true';
        }

        const { count, rows } = await Pdfs.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [[sortBy, sortOrder]],
            attributes: {
                exclude: ['file_url'] // Don't expose direct file URLs
            }
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
        console.error('Get PDFs error:', err);
        const error = new ErrorHandler('Failed to fetch PDFs', 500);
        return next(error);
    }
};

// Get single PDF by ID
exports.getPdfById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const pdf = await Pdfs.findByPk(id);
        if (!pdf) {
            return next(new ErrorHandler('PDF not found', 404));
        }

        res.status(200).json({
            success: true,
            data: pdf
        });
    } catch (err) {
        console.error('Get PDF by ID error:', err);
        const error = new ErrorHandler('Failed to fetch PDF', 500);
        return next(error);
    }
};

// Create new PDF record
exports.createPdf = async (req, res, next) => {
    try {
        const {
            title,
            description,
            category,
            subject,
            is_free = true,
            file_url,
            file_size
        } = req.body;

        // Check if PDF with same title exists
        const existingPdf = await Pdfs.findOne({ where: { title } });
        if (existingPdf) {
            return next(new ErrorHandler('PDF with this title already exists', 400));
        }

        const pdf = await Pdfs.create({
            title,
            description,
            file_url,
            file_size,
            category,
            subject,
            is_free,
            download_count: 0,
            uploaded_by: req.admin.id
        });

        res.status(201).json({
            success: true,
            message: 'PDF created successfully',
            data: pdf
        });
    } catch (err) {
        console.error('Create PDF error:', err);
        const error = new ErrorHandler('Failed to create PDF record', 500);
        return next(error);
    }
};

// Update PDF record
exports.updatePdf = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const pdf = await Pdfs.findByPk(id);
        if (!pdf) {
            return next(new ErrorHandler('PDF not found', 404));
        }

        // Check if title is being changed and already exists
        if (updateData.title && updateData.title !== pdf.title) {
            const existingPdf = await Pdfs.findOne({ 
                where: { 
                    title: updateData.title,
                    id: { [Op.ne]: id }
                } 
            });
            if (existingPdf) {
                return next(new ErrorHandler('PDF with this title already exists', 400));
            }
        }

        await pdf.update(updateData);

        res.status(200).json({
            success: true,
            message: 'PDF updated successfully',
            data: pdf
        });
    } catch (err) {
        console.error('Update PDF error:', err);
        const error = new ErrorHandler('Failed to update PDF', 500);
        return next(error);
    }
};

// Delete PDF
exports.deletePdf = async (req, res, next) => {
    try {
        const { id } = req.params;

        const pdf = await Pdfs.findByPk(id);
        if (!pdf) {
            return next(new ErrorHandler('PDF not found', 404));
        }

        // Optionally delete the actual file from storage
        // if (pdf.file_url && fs.existsSync(pdf.file_url)) {
        //     fs.unlinkSync(pdf.file_url);
        // }

        await pdf.destroy();

        res.status(200).json({
            success: true,
            message: 'PDF deleted successfully'
        });
    } catch (err) {
        console.error('Delete PDF error:', err);
        const error = new ErrorHandler('Failed to delete PDF', 500);
        return next(error);
    }
};

// Get PDF download URL (with access control)
exports.getPdfDownloadUrl = async (req, res, next) => {
    try {
        const { id } = req.params;

        const pdf = await Pdfs.findByPk(id);
        if (!pdf) {
            return next(new ErrorHandler('PDF not found', 404));
        }

        // Increment download count
        await pdf.increment('download_count');

        // Generate secure download URL or return file path
        // In production, you might want to generate signed URLs
        res.status(200).json({
            success: true,
            data: {
                download_url: pdf.file_url,
                filename: pdf.title,
                size: pdf.file_size
            }
        });
    } catch (err) {
        console.error('Get PDF download URL error:', err);
        const error = new ErrorHandler('Failed to get download URL', 500);
        return next(error);
    }
};

// Upload PDF file
exports.uploadPdf = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new ErrorHandler('Please upload a PDF file', 400));
        }

        const file = req.file;
        
        // Validate file type
        if (file.mimetype !== 'application/pdf') {
            return next(new ErrorHandler('Only PDF files are allowed', 400));
        }

        // File info for response
        const fileInfo = {
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            path: file.path,
            mimetype: file.mimetype
        };

        res.status(200).json({
            success: true,
            message: 'PDF uploaded successfully',
            data: fileInfo
        });
    } catch (err) {
        console.error('Upload PDF error:', err);
        const error = new ErrorHandler('Failed to upload PDF', 500);
        return next(error);
    }
};

// Get PDF statistics
exports.getPdfStats = async (req, res, next) => {
    try {
        const totalPdfs = await Pdfs.count();
        const freePdfs = await Pdfs.count({ where: { is_free: true } });
        const paidPdfs = await Pdfs.count({ where: { is_free: false } });
        
        // Get total downloads
        const downloadStats = await Pdfs.findAll({
            attributes: [
                [require('sequelize').fn('SUM', require('sequelize').col('download_count')), 'total_downloads']
            ]
        });

        // Get category-wise count
        const categoryStats = await Pdfs.findAll({
            attributes: [
                'category',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
                [require('sequelize').fn('SUM', require('sequelize').col('download_count')), 'downloads']
            ],
            group: ['category'],
            order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']]
        });

        // Get most downloaded PDFs
        const topDownloads = await Pdfs.findAll({
            attributes: ['id', 'title', 'download_count', 'category'],
            order: [['download_count', 'DESC']],
            limit: 10
        });

        res.status(200).json({
            success: true,
            data: {
                total_pdfs: totalPdfs,
                free_pdfs: freePdfs,
                paid_pdfs: paidPdfs,
                total_downloads: downloadStats[0]?.dataValues?.total_downloads || 0,
                category_stats: categoryStats,
                top_downloads: topDownloads
            }
        });
    } catch (err) {
        console.error('Get PDF stats error:', err);
        const error = new ErrorHandler('Failed to fetch PDF statistics', 500);
        return next(error);
    }
};

// Get PDF categories and subjects for filters
exports.getPdfFilters = async (req, res, next) => {
    try {
        const categories = await Pdfs.findAll({
            attributes: ['category'],
            group: ['category'],
            order: [['category', 'ASC']]
        });

        const subjects = await Pdfs.findAll({
            attributes: ['subject'],
            where: {
                subject: { [Op.ne]: null }
            },
            group: ['subject'],
            order: [['subject', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: {
                categories: categories.map(c => c.category),
                subjects: subjects.map(s => s.subject)
            }
        });
    } catch (err) {
        console.error('Get PDF filters error:', err);
        const error = new ErrorHandler('Failed to fetch PDF filters', 500);
        return next(error);
    }
};