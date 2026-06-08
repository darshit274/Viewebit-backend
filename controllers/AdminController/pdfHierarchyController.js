/**
 * PDF Hierarchy controller — mirrors the simple-hierarchy pattern used for
 * test-series categories (see TestManagementController.getTestSeriesRootCategories
 * and friends). The tree is:
 *
 *   root pdf_category (parent=null, level=0)
 *     ├── sub pdf_category (level=1)        — node_type=container
 *     │     ├── deeper sub pdf_category…
 *     │     └── pdf_holder category         — node_type=pdf_holder
 *     │           ├── PDF
 *     │           └── PDF
 *     └── pdf_holder category at root level too
 *
 * - `container`  = has only sub-categories
 * - `pdf_holder` = directly contains PDFs (leaf)
 * - `unset`      = freshly created, will be promoted on first add
 */

const { PdfCategory, Pdfs, sequelize } = require('../../models');
const { Op } = require('sequelize');
const fs = require('fs');
const ErrorHandler = require('../../utils/default/errorHandler');
const { validatePDFFile } = require('../../utils/pdfUpload');

// ===== ADMIN ENDPOINTS =====

/** GET /admin/pdf-hierarchy/roots — list all root categories */
exports.getRootCategories = async (req, res, next) => {
  try {
    const rootCategories = await PdfCategory.findAll({
      where: { parent_category_id: null, hierarchy_level: 0 },
      attributes: [
        'id', 'uuid', 'name', 'name_gujarati', 'description', 'description_gujarati',
        'icon', 'color', 'node_type', 'parent_category_id', 'hierarchy_level',
        'display_order', 'is_active', 'created_at', 'updated_at',
      ],
      order: [['display_order', 'ASC'], ['created_at', 'ASC']],
    });

    // Determine button state: both enabled if no content yet
    res.json({
      success: true,
      data: {
        content_type: rootCategories.length > 0 ? 'categories' : 'empty',
        content: rootCategories,
        buttons_state: {
          can_add_category: true,
          can_add_pdf: false, // PDFs only live inside categories
        },
        statistics: {
          root_categories_count: rootCategories.length,
        },
      },
    });
  } catch (err) {
    console.error('Error fetching PDF root categories:', err);
    return next(new ErrorHandler('Failed to fetch PDF root categories', 500));
  }
};

/** GET /admin/pdf-hierarchy/categories/:categoryUuid — content of a category */
exports.getCategoryContent = async (req, res, next) => {
  try {
    const { categoryUuid } = req.params;

    const category = await PdfCategory.findOne({
      where: { uuid: categoryUuid },
      include: [
        // Children categories — separate:true so the order option is actually applied
        {
          model: PdfCategory,
          as: 'childCategories',
          required: false,
          separate: true,
          order: [['display_order', 'ASC'], ['created_at', 'ASC']],
        },
        // PDFs directly in this category
        {
          model: Pdfs,
          as: 'pdfs',
          required: false,
          separate: true,
          order: [['display_order', 'ASC'], ['created_at', 'ASC']],
        },
        // Parent for breadcrumb
        {
          model: PdfCategory,
          as: 'parentCategory',
          attributes: ['id', 'uuid', 'name', 'hierarchy_level'],
        },
      ],
    });

    if (!category) {
      return next(new ErrorHandler('Category not found', 404));
    }

    const childCount = category.childCategories?.length || 0;
    const pdfCount = category.pdfs?.length || 0;

    let content = [];
    let content_type = 'empty';
    if (pdfCount > 0) {
      content_type = 'pdfs';
      content = category.pdfs;
    } else if (childCount > 0) {
      content_type = 'categories';
      content = category.childCategories;
    }

    // Either/or logic: once a category contains one kind of content,
    // the other "Add" button is disabled so the tree stays clean.
    const buttons_state = {
      can_add_category: pdfCount === 0,
      can_add_pdf: childCount === 0,
    };

    res.json({
      success: true,
      data: {
        category: {
          id: category.id,
          uuid: category.uuid,
          name: category.name,
          name_gujarati: category.name_gujarati,
          description: category.description,
          description_gujarati: category.description_gujarati,
          node_type: category.node_type,
          hierarchy_level: category.hierarchy_level,
          parent_category: category.parentCategory,
        },
        content_type,
        content,
        buttons_state,
        statistics: {
          child_categories_count: childCount,
          pdfs_count: pdfCount,
        },
      },
    });
  } catch (err) {
    console.error('Error fetching PDF category content:', err);
    return next(new ErrorHandler('Failed to fetch category content', 500));
  }
};

/** POST /admin/pdf-hierarchy/categories — create root category */
/** POST /admin/pdf-hierarchy/categories/:parentUuid/subcategories — create sub */
exports.createCategory = async (req, res, next) => {
  try {
    const { parentUuid } = req.params;
    const { name, name_gujarati, description, description_gujarati, icon, color } = req.body;

    if (!name || !name.trim()) {
      return next(new ErrorHandler('Category name is required', 400));
    }

    let parentCategory = null;
    let hierarchyLevel = 0;
    let parentId = null;

    if (parentUuid) {
      parentCategory = await PdfCategory.findOne({ where: { uuid: parentUuid } });
      if (!parentCategory) {
        return next(new ErrorHandler('Parent category not found', 404));
      }
      if (parentCategory.node_type === 'pdf_holder') {
        return next(new ErrorHandler(
          'Cannot add subcategories to a category that already contains PDFs',
          400
        ));
      }
      parentId = parentCategory.id;
      hierarchyLevel = parentCategory.hierarchy_level + 1;
    }

    // Auto-assign display_order: max among siblings + 1
    const siblingMax = await PdfCategory.findOne({
      attributes: [[sequelize.fn('MAX', sequelize.col('display_order')), 'maxOrder']],
      where: { parent_category_id: parentId },
      raw: true,
    });
    const nextDisplayOrder = (siblingMax?.maxOrder || 0) + 1;

    const newCategory = await PdfCategory.create({
      name: name.trim(),
      name_gujarati: name_gujarati?.trim() || null,
      description: description?.trim() || null,
      description_gujarati: description_gujarati?.trim() || null,
      icon: icon || 'Folder',
      color: color || '#3B82F6',
      parent_category_id: parentId,
      hierarchy_level: hierarchyLevel,
      display_order: nextDisplayOrder,
      node_type: 'unset',
      is_active: true,
    });

    // Promote parent from 'unset' to 'container' on first child
    if (parentCategory && parentCategory.node_type === 'unset') {
      await parentCategory.update({ node_type: 'container' });
    }

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategory,
    });
  } catch (err) {
    console.error('Error creating PDF category:', err);
    return next(new ErrorHandler('Failed to create category', 500));
  }
};

/** PUT /admin/pdf-hierarchy/categories/:categoryUuid */
exports.updateCategory = async (req, res, next) => {
  try {
    const { categoryUuid } = req.params;
    const { name, name_gujarati, description, description_gujarati, icon, color, is_active } = req.body;

    const category = await PdfCategory.findOne({ where: { uuid: categoryUuid } });
    if (!category) {
      return next(new ErrorHandler('Category not found', 404));
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (name_gujarati !== undefined) updates.name_gujarati = name_gujarati?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (description_gujarati !== undefined) updates.description_gujarati = description_gujarati?.trim() || null;
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;
    if (is_active !== undefined) updates.is_active = !!is_active;

    await category.update(updates);

    res.json({ success: true, message: 'Category updated successfully', data: category });
  } catch (err) {
    console.error('Error updating PDF category:', err);
    return next(new ErrorHandler('Failed to update category', 500));
  }
};

/** DELETE /admin/pdf-hierarchy/categories/:categoryUuid */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { categoryUuid } = req.params;

    const category = await PdfCategory.findOne({ where: { uuid: categoryUuid } });
    if (!category) {
      return next(new ErrorHandler('Category not found', 404));
    }

    // Guard: don't allow deletion if there's content underneath. Admin should
    // empty it first so they understand what they're removing.
    const childCount = await PdfCategory.count({ where: { parent_category_id: category.id } });
    const pdfCount = await Pdfs.count({ where: { category_id: category.id } });
    if (childCount > 0 || pdfCount > 0) {
      return next(new ErrorHandler(
        `Cannot delete: this category contains ${childCount} sub-categories and ${pdfCount} PDFs. Move or delete them first.`,
        400
      ));
    }

    await category.destroy();

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting PDF category:', err);
    return next(new ErrorHandler('Failed to delete category', 500));
  }
};

/** PATCH /admin/pdf-hierarchy/categories/reorder — body: { items: [{uuid, display_order}, ...] } */
exports.reorderCategories = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return next(new ErrorHandler('items array is required', 400));
    }

    await Promise.all(items.map(({ uuid, display_order }) =>
      PdfCategory.update({ display_order }, { where: { uuid } })
    ));

    res.json({ success: true, message: 'Category order updated' });
  } catch (err) {
    console.error('Error reordering PDF categories:', err);
    return next(new ErrorHandler('Failed to reorder categories', 500));
  }
};

/** PATCH /admin/pdf-hierarchy/pdfs/reorder — body: { items: [{id, display_order}, ...] } */
exports.reorderPdfs = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return next(new ErrorHandler('items array is required', 400));
    }

    await Promise.all(items.map(({ id, display_order }) =>
      Pdfs.update({ display_order }, { where: { id } })
    ));

    res.json({ success: true, message: 'PDF order updated' });
  } catch (err) {
    console.error('Error reordering PDFs:', err);
    return next(new ErrorHandler('Failed to reorder PDFs', 500));
  }
};

/**
 * POST /admin/pdf-hierarchy/categories/:categoryUuid/upload
 *
 * Upload a brand-new PDF directly into a leaf category. This is the path used
 * by the hierarchy admin UI — there's no separate library; PDFs only exist
 * inside their category. Expects multer middleware to have populated req.files.
 */
exports.uploadPdfToCategory = async (req, res, next) => {
  try {
    const { categoryUuid } = req.params;
    const {
      title,
      description,
      access_level = 'free',
      tags,
      price,
      currency,
      discount_percentage,
      subscription_required,
      preview_pages,
    } = req.body;
    const adminId = req.admin?.id;

    if (!req.files || req.files.length === 0) {
      return next(new ErrorHandler('No PDF file provided', 400));
    }
    const file = req.files[0];

    // Basic file validation
    if (file.mimetype !== 'application/pdf') {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return next(new ErrorHandler('Only PDF files are allowed', 400));
    }
    if (file.size > 50 * 1024 * 1024) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return next(new ErrorHandler('File size must be less than 50MB', 400));
    }
    if (!validatePDFFile(file.path)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return next(new ErrorHandler('Invalid PDF — file signature check failed', 400));
    }

    if (!title || !title.trim()) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return next(new ErrorHandler('Title is required', 400));
    }

    const category = await PdfCategory.findOne({ where: { uuid: categoryUuid } });
    if (!category) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return next(new ErrorHandler('Category not found', 404));
    }
    if (category.node_type === 'container') {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return next(new ErrorHandler(
        'Cannot upload PDFs into a category that contains sub-categories',
        400
      ));
    }

    // Auto-assign display_order at the end of the leaf
    const siblingMax = await Pdfs.findOne({
      attributes: [[sequelize.fn('MAX', sequelize.col('display_order')), 'maxOrder']],
      where: { category_id: category.id },
      raw: true,
    });
    const nextDisplayOrder = (siblingMax?.maxOrder || 0) + 1;

    let parsedTags = null;
    if (tags) {
      try { parsedTags = JSON.parse(tags); }
      catch (_) {
        parsedTags = String(tags).split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    const pdf = await Pdfs.create({
      title: title.trim(),
      description: description?.trim() || null,
      category_id: category.id,
      access_level,
      tags: parsedTags,
      uploaded_by: adminId,
      original_filename: file.originalname,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      price: price ? parseFloat(price) : 0,
      currency: currency || 'INR',
      is_free: access_level === 'free',
      discount_percentage: discount_percentage ? parseFloat(discount_percentage) : 0,
      subscription_required: subscription_required === 'true' || subscription_required === true,
      preview_pages: preview_pages ? parseInt(preview_pages) : 0,
      display_order: nextDisplayOrder,
    });

    // Promote category from 'unset' to 'pdf_holder' on first upload
    if (category.node_type === 'unset') {
      await category.update({ node_type: 'pdf_holder' });
    }

    res.status(201).json({
      success: true,
      message: 'PDF uploaded successfully',
      data: pdf,
    });
  } catch (err) {
    console.error('Error uploading PDF to category:', err);
    if (req.files?.[0]?.path && fs.existsSync(req.files[0].path)) {
      fs.unlinkSync(req.files[0].path);
    }
    return next(new ErrorHandler('Failed to upload PDF', 500));
  }
};

/**
 * PUT /admin/pdf-hierarchy/pdfs/:pdfId
 * Update metadata for an existing PDF (title, description, pricing). The file
 * itself is replaced via a re-upload, not via this endpoint.
 */
exports.updatePdfMetadata = async (req, res, next) => {
  try {
    const { pdfId } = req.params;
    const pdf = await Pdfs.findOne({ where: { id: pdfId } });
    if (!pdf) return next(new ErrorHandler('PDF not found', 404));

    const allowed = [
      'title', 'description', 'access_level', 'price', 'currency',
      'discount_percentage', 'subscription_required', 'preview_pages',
      'is_active', 'is_featured', 'tags',
    ];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === 'tags' && typeof req.body[k] === 'string') {
          try { updates[k] = JSON.parse(req.body[k]); }
          catch (_) { updates[k] = req.body[k].split(',').map(t => t.trim()).filter(Boolean); }
        } else {
          updates[k] = req.body[k];
        }
      }
    }
    if (updates.access_level && updates.is_free === undefined) {
      updates.is_free = updates.access_level === 'free';
    }
    await pdf.update(updates);
    res.json({ success: true, message: 'PDF updated', data: pdf });
  } catch (err) {
    console.error('Error updating PDF:', err);
    return next(new ErrorHandler('Failed to update PDF', 500));
  }
};

/** DELETE /admin/pdf-hierarchy/pdfs/:pdfId — delete the PDF record AND its file */
exports.deletePdf = async (req, res, next) => {
  try {
    const { pdfId } = req.params;
    const pdf = await Pdfs.findOne({ where: { id: pdfId } });
    if (!pdf) return next(new ErrorHandler('PDF not found', 404));

    const oldCategoryId = pdf.category_id;
    const filePath = pdf.file_path;

    await pdf.destroy();

    // Best-effort file cleanup — don't fail the request if the file is already gone
    if (filePath) {
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
      catch (e) { console.warn('Could not delete PDF file:', filePath, e.message); }
    }

    // If the parent category is now empty, demote it back to 'unset'
    if (oldCategoryId) {
      const remainingPdfs = await Pdfs.count({ where: { category_id: oldCategoryId } });
      const childCount = await PdfCategory.count({ where: { parent_category_id: oldCategoryId } });
      if (remainingPdfs === 0 && childCount === 0) {
        await PdfCategory.update({ node_type: 'unset' }, { where: { id: oldCategoryId } });
      }
    }

    res.json({ success: true, message: 'PDF deleted' });
  } catch (err) {
    console.error('Error deleting PDF:', err);
    return next(new ErrorHandler('Failed to delete PDF', 500));
  }
};

/** POST /admin/pdf-hierarchy/categories/:categoryUuid/attach-pdf — link an existing PDF (kept for legacy use only) */
exports.attachPdfToCategory = async (req, res, next) => {
  try {
    const { categoryUuid } = req.params;
    const { pdfId } = req.body;

    if (!pdfId) return next(new ErrorHandler('pdfId is required', 400));

    const category = await PdfCategory.findOne({ where: { uuid: categoryUuid } });
    if (!category) return next(new ErrorHandler('Category not found', 404));
    if (category.node_type === 'container') {
      return next(new ErrorHandler(
        'Cannot add PDFs to a category that contains sub-categories',
        400
      ));
    }

    const pdf = await Pdfs.findOne({ where: { id: pdfId } });
    if (!pdf) return next(new ErrorHandler('PDF not found', 404));

    // Auto-assign display_order
    const siblingMax = await Pdfs.findOne({
      attributes: [[sequelize.fn('MAX', sequelize.col('display_order')), 'maxOrder']],
      where: { category_id: category.id },
      raw: true,
    });
    const nextDisplayOrder = (siblingMax?.maxOrder || 0) + 1;

    await pdf.update({ category_id: category.id, display_order: nextDisplayOrder });

    // Promote category from 'unset' to 'pdf_holder' on first attach
    if (category.node_type === 'unset') {
      await category.update({ node_type: 'pdf_holder' });
    }

    res.json({ success: true, message: 'PDF added to category', data: pdf });
  } catch (err) {
    console.error('Error attaching PDF to category:', err);
    return next(new ErrorHandler('Failed to add PDF to category', 500));
  }
};

/** DELETE /admin/pdf-hierarchy/pdfs/:pdfId/detach — remove a PDF from its category (PDF itself stays) */
exports.detachPdfFromCategory = async (req, res, next) => {
  try {
    const { pdfId } = req.params;
    const pdf = await Pdfs.findOne({ where: { id: pdfId } });
    if (!pdf) return next(new ErrorHandler('PDF not found', 404));

    const oldCategoryId = pdf.category_id;
    await pdf.update({ category_id: null });

    // If the old category is now empty of PDFs and has no children, demote to 'unset'
    if (oldCategoryId) {
      const remainingPdfs = await Pdfs.count({ where: { category_id: oldCategoryId } });
      const childCount = await PdfCategory.count({ where: { parent_category_id: oldCategoryId } });
      if (remainingPdfs === 0 && childCount === 0) {
        await PdfCategory.update({ node_type: 'unset' }, { where: { id: oldCategoryId } });
      }
    }

    res.json({ success: true, message: 'PDF removed from category' });
  } catch (err) {
    console.error('Error detaching PDF:', err);
    return next(new ErrorHandler('Failed to remove PDF from category', 500));
  }
};

// ===== STUDENT-FACING ENDPOINTS (no admin auth) =====

/** GET /api/pdfs/hierarchy/roots — student browses root PDF categories */
exports.studentGetRootCategories = async (req, res, next) => {
  try {
    const rootCategories = await PdfCategory.findAll({
      where: { parent_category_id: null, hierarchy_level: 0, is_active: true },
      attributes: [
        'id', 'uuid', 'name', 'name_gujarati', 'description', 'description_gujarati',
        'icon', 'color', 'node_type', 'display_order',
      ],
      order: [['display_order', 'ASC'], ['created_at', 'ASC']],
    });

    // Add a child/pdf count for each so the UI can render the right badge
    const withCounts = await Promise.all(rootCategories.map(async (cat) => {
      const subcategories_count = await PdfCategory.count({
        where: { parent_category_id: cat.id, is_active: true },
      });
      const pdfs_count = await Pdfs.count({ where: { category_id: cat.id, is_active: true } });
      return { ...cat.toJSON(), subcategories_count, pdfs_count };
    }));

    res.json({ success: true, data: withCounts });
  } catch (err) {
    console.error('Error fetching student PDF roots:', err);
    return next(new ErrorHandler('Failed to load PDF categories', 500));
  }
};

/** GET /api/pdfs/hierarchy/categories/:categoryUuid — content of a category */
exports.studentGetCategoryContent = async (req, res, next) => {
  try {
    const { categoryUuid } = req.params;

    const category = await PdfCategory.findOne({
      where: { uuid: categoryUuid, is_active: true },
      attributes: [
        'id', 'uuid', 'name', 'name_gujarati', 'description', 'description_gujarati',
        'icon', 'color', 'node_type', 'hierarchy_level',
      ],
      include: [
        {
          model: PdfCategory,
          as: 'parentCategory',
          attributes: ['id', 'uuid', 'name', 'name_gujarati', 'hierarchy_level'],
        },
      ],
    });
    if (!category) return next(new ErrorHandler('Category not found', 404));

    // Active children
    const childCategories = await PdfCategory.findAll({
      where: { parent_category_id: category.id, is_active: true },
      attributes: [
        'id', 'uuid', 'name', 'name_gujarati', 'description', 'description_gujarati',
        'icon', 'color', 'node_type', 'display_order',
      ],
      order: [['display_order', 'ASC'], ['created_at', 'ASC']],
    });
    const childCategoriesWithCounts = await Promise.all(childCategories.map(async (c) => {
      const subcategories_count = await PdfCategory.count({
        where: { parent_category_id: c.id, is_active: true },
      });
      const pdfs_count = await Pdfs.count({ where: { category_id: c.id, is_active: true } });
      return { ...c.toJSON(), subcategories_count, pdfs_count };
    }));

    // Active PDFs in this category
    const pdfs = await Pdfs.findAll({
      where: { category_id: category.id, is_active: true },
      order: [['display_order', 'ASC'], ['created_at', 'ASC']],
      attributes: [
        'id', 'title', 'description', 'original_filename', 'file_size', 'mime_type',
        'access_level', 'tags', 'price', 'currency', 'is_free', 'preview_pages',
        'is_featured', 'display_order', 'created_at',
      ],
    });

    let content_type = 'empty';
    let content = [];
    if (pdfs.length > 0) {
      content_type = 'pdfs';
      content = pdfs;
    } else if (childCategoriesWithCounts.length > 0) {
      content_type = 'categories';
      content = childCategoriesWithCounts;
    }

    res.json({
      success: true,
      data: {
        category,
        content_type,
        content,
        statistics: {
          subcategories_count: childCategoriesWithCounts.length,
          pdfs_count: pdfs.length,
        },
      },
    });
  } catch (err) {
    console.error('Error fetching student PDF category content:', err);
    return next(new ErrorHandler('Failed to load category content', 500));
  }
};
