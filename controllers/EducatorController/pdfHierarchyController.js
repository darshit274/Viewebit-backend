/**
 * Educator-scoped PDF hierarchy controller — mirrors
 * controllers/AdminController/pdfHierarchyController.js's tree pattern
 * (root pdf_category → sub-categories → pdf_holder category → PDFs), but
 * every node is owned by req.educator.id via PdfCategory.educator_id /
 * Pdfs.uploaded_by_educator_id, and pricing is always free — access to an
 * educator's PDFs is gated at the Course level (TestSeries/Subscription),
 * not by a second per-folder pricing dimension.
 */
const { PdfCategory, Pdfs, sequelize } = require('../../models');
const fs = require('fs');
const ErrorHandler = require('../../utils/default/errorHandler');
const { validatePDFFile } = require('../../utils/pdfUpload');
const { PDF_UPLOAD_MAX_SIZE_BYTES, PDF_UPLOAD_MAX_SIZE_MB } = require('../../utils/uploadConfig');

const findOwnedCategory = async (categoryUuid, educatorId) => {
    return PdfCategory.findOne({ where: { uuid: categoryUuid, educator_id: educatorId } });
};

exports.getRootCategories = async (req, res, next) => {
    try {
        const categories = await PdfCategory.findAll({
            where: { educator_id: req.educator.id, parent_category_id: null },
            order: [['display_order', 'ASC'], ['created_at', 'ASC']]
        });
        res.status(200).json({ success: true, data: categories });
    } catch (err) {
        console.error('Get educator PDF root categories error:', err);
        return next(new ErrorHandler('Failed to fetch PDF categories', 500));
    }
};

exports.getCategoryContent = async (req, res, next) => {
    try {
        const category = await PdfCategory.findOne({
            where: { uuid: req.params.categoryUuid, educator_id: req.educator.id },
            include: [
                { model: PdfCategory, as: 'childCategories', required: false, separate: true, order: [['display_order', 'ASC']] },
                { model: Pdfs, as: 'pdfs', required: false, separate: true, order: [['display_order', 'ASC']] },
                { model: PdfCategory, as: 'parentCategory', attributes: ['id', 'uuid', 'name'] }
            ]
        });
        if (!category) return next(new ErrorHandler('Category not found or not owned by you', 404));

        res.status(200).json({
            success: true,
            data: {
                category,
                childCount: category.childCategories?.length || 0,
                pdfCount: category.pdfs?.length || 0
            }
        });
    } catch (err) {
        console.error('Get educator PDF category content error:', err);
        return next(new ErrorHandler('Failed to fetch category content', 500));
    }
};

exports.createCategory = async (req, res, next) => {
    try {
        const { parentUuid } = req.params;
        const { name, description } = req.body;
        if (!name || !name.trim()) return next(new ErrorHandler('Category name is required', 400));

        let parentCategory = null;
        let hierarchyLevel = 0;
        let parentId = null;

        if (parentUuid) {
            parentCategory = await findOwnedCategory(parentUuid, req.educator.id);
            if (!parentCategory) return next(new ErrorHandler('Parent category not found or not owned by you', 404));
            if (parentCategory.node_type === 'pdf_holder') {
                return next(new ErrorHandler('Cannot add subcategories to a category that already contains PDFs', 400));
            }
            parentId = parentCategory.id;
            hierarchyLevel = parentCategory.hierarchy_level + 1;
        }

        const siblingMax = await PdfCategory.findOne({
            attributes: [[sequelize.fn('MAX', sequelize.col('display_order')), 'maxOrder']],
            where: { parent_category_id: parentId, educator_id: req.educator.id },
            raw: true
        });
        const nextDisplayOrder = (siblingMax?.maxOrder || 0) + 1;

        const category = await PdfCategory.create({
            name: name.trim(),
            description: description?.trim() || null,
            icon: 'Folder',
            color: '#3B82F6',
            parent_category_id: parentId,
            hierarchy_level: hierarchyLevel,
            display_order: nextDisplayOrder,
            node_type: 'unset',
            is_active: true,
            educator_id: req.educator.id,
            pricing_type: 'free'
        });

        if (parentCategory && parentCategory.node_type === 'unset') {
            await parentCategory.update({ node_type: 'container' });
        }

        res.status(201).json({ success: true, message: 'Category created successfully', data: category });
    } catch (err) {
        console.error('Create educator PDF category error:', err);
        return next(new ErrorHandler('Failed to create category', 500));
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const category = await findOwnedCategory(req.params.categoryUuid, req.educator.id);
        if (!category) return next(new ErrorHandler('Category not found or not owned by you', 404));

        const { name, description, is_active } = req.body;
        await category.update({
            ...(name !== undefined && { name: name.trim() }),
            ...(description !== undefined && { description: description?.trim() || null }),
            ...(is_active !== undefined && { is_active: !!is_active })
        });

        res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
    } catch (err) {
        console.error('Update educator PDF category error:', err);
        return next(new ErrorHandler('Failed to update category', 500));
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await findOwnedCategory(req.params.categoryUuid, req.educator.id);
        if (!category) return next(new ErrorHandler('Category not found or not owned by you', 404));

        const childCount = await PdfCategory.count({ where: { parent_category_id: category.id } });
        const pdfCount = await Pdfs.count({ where: { category_id: category.id } });
        if (childCount > 0 || pdfCount > 0) {
            return next(new ErrorHandler(`Cannot delete: this category contains ${childCount} sub-categories and ${pdfCount} PDFs. Remove them first.`, 400));
        }

        await category.destroy();
        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Delete educator PDF category error:', err);
        return next(new ErrorHandler('Failed to delete category', 500));
    }
};

exports.uploadPdf = async (req, res, next) => {
    try {
        const { categoryUuid } = req.params;
        const { title, description } = req.body;

        if (!req.files || req.files.length === 0) return next(new ErrorHandler('No PDF file provided', 400));
        const file = req.files[0];

        if (file.mimetype !== 'application/pdf') {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return next(new ErrorHandler('Only PDF files are allowed', 400));
        }
        if (file.size > PDF_UPLOAD_MAX_SIZE_BYTES) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return next(new ErrorHandler(`File size must be less than ${PDF_UPLOAD_MAX_SIZE_MB}MB`, 400));
        }
        if (!validatePDFFile(file.path)) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return next(new ErrorHandler('Invalid PDF — file signature check failed', 400));
        }
        if (!title || !title.trim()) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return next(new ErrorHandler('Title is required', 400));
        }

        const category = await findOwnedCategory(categoryUuid, req.educator.id);
        if (!category) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return next(new ErrorHandler('Category not found or not owned by you', 404));
        }
        if (category.node_type === 'container') {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return next(new ErrorHandler('Cannot upload PDFs into a category that contains sub-categories', 400));
        }

        const siblingMax = await Pdfs.findOne({
            attributes: [[sequelize.fn('MAX', sequelize.col('display_order')), 'maxOrder']],
            where: { category_id: category.id },
            raw: true
        });
        const nextDisplayOrder = (Number(siblingMax?.maxOrder) || 0) + 1;

        const pdf = await Pdfs.create({
            title: title.trim(),
            description: description?.trim() || null,
            category_id: category.id,
            access_level: 'free',
            uploaded_by_educator_id: req.educator.id,
            original_filename: file.originalname,
            file_path: file.path,
            file_size: file.size,
            mime_type: file.mimetype,
            price: 0,
            is_free: true,
            display_order: nextDisplayOrder
        });

        if (category.node_type === 'unset') {
            await category.update({ node_type: 'pdf_holder' });
        }

        res.status(201).json({ success: true, message: 'PDF uploaded successfully', data: pdf });
    } catch (err) {
        console.error('Error uploading educator PDF:', err);
        if (req.files?.[0]?.path && fs.existsSync(req.files[0].path)) fs.unlinkSync(req.files[0].path);
        return next(new ErrorHandler('Failed to upload PDF', 500));
    }
};

exports.updatePdfMetadata = async (req, res, next) => {
    try {
        const pdf = await Pdfs.findOne({ where: { id: req.params.pdfId, uploaded_by_educator_id: req.educator.id } });
        if (!pdf) return next(new ErrorHandler('PDF not found or not owned by you', 404));

        const { title, description, is_active } = req.body;
        await pdf.update({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(is_active !== undefined && { is_active })
        });

        res.status(200).json({ success: true, message: 'PDF updated', data: pdf });
    } catch (err) {
        console.error('Error updating educator PDF:', err);
        return next(new ErrorHandler('Failed to update PDF', 500));
    }
};

exports.deletePdf = async (req, res, next) => {
    try {
        const pdf = await Pdfs.findOne({ where: { id: req.params.pdfId, uploaded_by_educator_id: req.educator.id } });
        if (!pdf) return next(new ErrorHandler('PDF not found or not owned by you', 404));

        const categoryId = pdf.category_id;
        const filePath = pdf.file_path;
        await pdf.destroy();

        if (filePath) {
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
            catch (e) { console.warn('Could not delete PDF file:', filePath, e.message); }
        }

        if (categoryId) {
            const remainingPdfs = await Pdfs.count({ where: { category_id: categoryId } });
            const childCount = await PdfCategory.count({ where: { parent_category_id: categoryId } });
            if (remainingPdfs === 0 && childCount === 0) {
                await PdfCategory.update({ node_type: 'unset' }, { where: { id: categoryId } });
            }
        }

        res.status(200).json({ success: true, message: 'PDF deleted' });
    } catch (err) {
        console.error('Error deleting educator PDF:', err);
        return next(new ErrorHandler('Failed to delete PDF', 500));
    }
};
