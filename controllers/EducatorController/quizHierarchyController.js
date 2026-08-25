/**
 * Educator-scoped quiz hierarchy controller — mirrors the real, live
 * Category/Question system (see controllers/TestManagementController.js's
 * "simple hierarchy" section) that both web and mobile actually use to take
 * quizzes, NOT the separate DynamicCategory/hierarchy_categories system.
 *
 * Every Category/Question created here is scoped to req.educator.id so an
 * educator only ever sees and edits their own quiz bank. Categories are
 * rooted under a private "quiz bank" TestSeries auto-created per educator
 * (Educator.quiz_bank_test_series_id) — that TestSeries is never linked to
 * any Course and never shown to students directly; a category only becomes
 * reachable by students once a Lesson/Assignment points at it.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ErrorHandler = require('../../utils/default/errorHandler');
const { Category, Question, sequelize } = require('../../models');
const { getOrCreateQuizBank, findOwnedCategory, createChildCategory } = require('../../utils/quizCategoryHelpers');
const { buildSampleRows, parseAndValidateFile } = require('../../utils/questionImportParser');

const importUploadDir = path.join(__dirname, '../../uploads/tmp_question_imports');
const importUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            if (!fs.existsSync(importUploadDir)) fs.mkdirSync(importUploadDir, { recursive: true });
            cb(null, importUploadDir);
        },
        filename: (req, file, cb) => cb(null, `import-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
    }),
    fileFilter: (req, file, cb) => {
        const allowed = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});
exports.parseImportUploadMiddleware = importUpload.single('file');

exports.getRootCategories = async (req, res, next) => {
    try {
        const categories = await Category.findAll({
            where: { educator_id: req.educator.id, parent_category_id: null },
            order: [['display_order', 'ASC'], ['created_at', 'ASC']]
        });
        res.status(200).json({ success: true, data: categories });
    } catch (err) {
        console.error('Get educator quiz root categories error:', err);
        return next(new ErrorHandler('Failed to fetch quiz categories', 500));
    }
};

exports.getCategoryContent = async (req, res, next) => {
    try {
        const category = await Category.findOne({
            where: { uuid: req.params.categoryUuid, educator_id: req.educator.id },
            include: [
                { model: Category, as: 'childCategories', required: false, separate: true, order: [['display_order', 'ASC']] },
                { model: Question, as: 'questions', required: false, separate: true, order: [['display_order', 'ASC']] },
                { model: Category, as: 'parentCategory', attributes: ['id', 'uuid', 'name'] }
            ]
        });
        if (!category) return next(new ErrorHandler('Category not found or not owned by you', 404));

        res.status(200).json({
            success: true,
            data: {
                category,
                childCount: category.childCategories?.length || 0,
                questionCount: category.questions?.length || 0
            }
        });
    } catch (err) {
        console.error('Get educator quiz category content error:', err);
        return next(new ErrorHandler('Failed to fetch category content', 500));
    }
};

// POST /educator/quizzes/categories (root) or /educator/quizzes/categories/:parentUuid/subcategories
exports.createCategory = async (req, res, next) => {
    try {
        const { parentUuid } = req.params;
        const { name, description, test_duration_minutes, negative_marking_enabled, negative_marks_per_wrong } = req.body;

        if (!name || !name.trim()) return next(new ErrorHandler('Category name is required', 400));

        let parentCategory = null;
        let testSeriesId;
        let hierarchyLevel = 0;

        if (parentUuid) {
            parentCategory = await findOwnedCategory(parentUuid, req.educator.id);
            if (!parentCategory) return next(new ErrorHandler('Parent category not found or not owned by you', 404));
            if (parentCategory.node_type === 'question_holder') {
                return next(new ErrorHandler('Cannot add subcategories to a category that already contains questions', 400));
            }
            testSeriesId = parentCategory.test_series_id;
            hierarchyLevel = parentCategory.hierarchy_level + 1;
        } else {
            const quizBank = await getOrCreateQuizBank(req.educator);
            testSeriesId = quizBank.id;
        }

        const category = await createChildCategory({
            parentCategory, testSeriesId, hierarchyLevel, educatorId: req.educator.id, name, description
        });

        if (test_duration_minutes !== undefined || negative_marking_enabled !== undefined || negative_marks_per_wrong !== undefined) {
            await category.update({
                ...(test_duration_minutes !== undefined && { test_duration_minutes }),
                ...(negative_marking_enabled !== undefined && { negative_marking_enabled }),
                ...(negative_marks_per_wrong !== undefined && { negative_marks_per_wrong })
            });
        }

        res.status(201).json({ success: true, message: 'Category created successfully', data: category });
    } catch (err) {
        console.error('Create educator quiz category error:', err);
        return next(new ErrorHandler('Failed to create category', 500));
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const category = await findOwnedCategory(req.params.categoryUuid, req.educator.id);
        if (!category) return next(new ErrorHandler('Category not found or not owned by you', 404));

        const { name, description, is_active, test_duration_minutes, negative_marking_enabled, negative_marks_per_wrong } = req.body;
        await category.update({
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(is_active !== undefined && { is_active }),
            ...(test_duration_minutes !== undefined && { test_duration_minutes }),
            ...(negative_marking_enabled !== undefined && { negative_marking_enabled }),
            ...(negative_marks_per_wrong !== undefined && { negative_marks_per_wrong })
        });

        res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
    } catch (err) {
        console.error('Update educator quiz category error:', err);
        return next(new ErrorHandler('Failed to update category', 500));
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const category = await findOwnedCategory(req.params.categoryUuid, req.educator.id);
        if (!category) return next(new ErrorHandler('Category not found or not owned by you', 404));

        const childCount = await Category.count({ where: { parent_category_id: category.id } });
        if (childCount > 0) return next(new ErrorHandler('Cannot delete a category that still has subcategories', 400));

        const questionCount = await Question.count({ where: { category_id: category.id } });
        if (questionCount > 0) return next(new ErrorHandler('Cannot delete a category that still has questions', 400));

        await category.destroy();
        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Delete educator quiz category error:', err);
        return next(new ErrorHandler('Failed to delete category', 500));
    }
};

// Questions ------------------------------------------------------------------

exports.createQuestion = async (req, res, next) => {
    try {
        const { categoryUuid } = req.params;
        const {
            question_text, option_a, option_b, option_c, option_d, correct_answer,
            explanation, marks
        } = req.body;

        if (!question_text?.trim()) return next(new ErrorHandler('Question text is required', 400));
        if (!option_a?.trim() || !option_b?.trim() || !option_c?.trim() || !option_d?.trim()) {
            return next(new ErrorHandler('All four options are required', 400));
        }
        if (!['A', 'B', 'C', 'D'].includes(correct_answer)) {
            return next(new ErrorHandler('correct_answer must be A, B, C or D', 400));
        }

        const category = await findOwnedCategory(categoryUuid, req.educator.id);
        if (!category) return next(new ErrorHandler('Category not found or not owned by you', 404));
        if (category.node_type === 'container') {
            return next(new ErrorHandler('Cannot add questions to a category that contains subcategories', 400));
        }

        const qMax = await Question.findOne({
            attributes: [[sequelize.fn('MAX', sequelize.col('display_order')), 'maxOrder']],
            where: { category_id: category.id },
            raw: true
        });
        const nextDisplayOrder = (qMax?.maxOrder || 0) + 1;

        const question = await Question.create({
            category_id: category.id,
            question_text: question_text.trim(),
            option_a: option_a.trim(),
            option_b: option_b.trim(),
            option_c: option_c.trim(),
            option_d: option_d.trim(),
            correct_answer,
            explanation: explanation?.trim() || null,
            marks: parseInt(marks) || 1,
            display_order: nextDisplayOrder
        });

        if (category.node_type === 'unset') {
            await category.update({ node_type: 'question_holder' });
        }

        res.status(201).json({ success: true, message: 'Question added successfully', data: question });
    } catch (err) {
        console.error('Create educator quiz question error:', err);
        return next(new ErrorHandler('Failed to create question', 500));
    }
};

exports.bulkCreateQuestions = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { categoryUuid } = req.params;
        const { questions } = req.body;

        if (!Array.isArray(questions) || questions.length === 0) {
            await t.rollback();
            return next(new ErrorHandler('At least one question is required', 400));
        }

        const category = await findOwnedCategory(categoryUuid, req.educator.id);
        if (!category) {
            await t.rollback();
            return next(new ErrorHandler('Category not found or not owned by you', 404));
        }
        if (category.node_type === 'container') {
            await t.rollback();
            return next(new ErrorHandler('Cannot add questions to a category that contains subcategories', 400));
        }

        for (const [i, q] of questions.entries()) {
            if (!q.question_text?.trim()) throw new ErrorHandler(`Question ${i + 1}: question text is required`, 400);
            if (!q.option_a?.trim() || !q.option_b?.trim() || !q.option_c?.trim() || !q.option_d?.trim()) {
                throw new ErrorHandler(`Question ${i + 1}: all four options are required`, 400);
            }
            if (!['A', 'B', 'C', 'D'].includes(q.correct_answer)) {
                throw new ErrorHandler(`Question ${i + 1}: correct_answer must be A, B, C or D`, 400);
            }
        }

        const qMax = await Question.findOne({
            attributes: [[sequelize.fn('MAX', sequelize.col('display_order')), 'maxOrder']],
            where: { category_id: category.id },
            raw: true,
            transaction: t
        });
        let nextOrder = (qMax?.maxOrder || 0) + 1;

        const rows = questions.map((q) => ({
            category_id: category.id,
            question_text: q.question_text.trim(),
            option_a: q.option_a.trim(),
            option_b: q.option_b.trim(),
            option_c: q.option_c.trim(),
            option_d: q.option_d.trim(),
            correct_answer: q.correct_answer,
            explanation: q.explanation?.trim() || null,
            marks: parseInt(q.marks) || 1,
            display_order: nextOrder++
        }));

        const created = await Question.bulkCreate(rows, { transaction: t });

        if (category.node_type === 'unset') {
            await category.update({ node_type: 'question_holder' }, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, data: { created: created.length, questions: created } });
    } catch (err) {
        await t.rollback();
        if (err instanceof ErrorHandler) return next(err);
        console.error('Bulk create questions error:', err);
        return next(new ErrorHandler('Failed to add questions', 500));
    }
};

exports.updateQuestion = async (req, res, next) => {
    try {
        const question = await Question.findOne({
            where: { uuid: req.params.questionUuid },
            include: [{ model: Category, as: 'category', where: { educator_id: req.educator.id } }]
        });
        if (!question) return next(new ErrorHandler('Question not found or not owned by you', 404));

        const { question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, is_active } = req.body;
        await question.update({
            ...(question_text !== undefined && { question_text }),
            ...(option_a !== undefined && { option_a }),
            ...(option_b !== undefined && { option_b }),
            ...(option_c !== undefined && { option_c }),
            ...(option_d !== undefined && { option_d }),
            ...(correct_answer !== undefined && { correct_answer }),
            ...(explanation !== undefined && { explanation }),
            ...(marks !== undefined && { marks }),
            ...(is_active !== undefined && { is_active })
        });

        res.status(200).json({ success: true, message: 'Question updated successfully', data: question });
    } catch (err) {
        console.error('Update educator quiz question error:', err);
        return next(new ErrorHandler('Failed to update question', 500));
    }
};

exports.deleteQuestion = async (req, res, next) => {
    try {
        const question = await Question.findOne({
            where: { uuid: req.params.questionUuid },
            include: [{ model: Category, as: 'category', where: { educator_id: req.educator.id } }]
        });
        if (!question) return next(new ErrorHandler('Question not found or not owned by you', 404));

        await question.destroy();
        res.status(200).json({ success: true, message: 'Question deleted successfully' });
    } catch (err) {
        console.error('Delete educator quiz question error:', err);
        return next(new ErrorHandler('Failed to delete question', 500));
    }
};

// Import (Excel/CSV) ----------------------------------------------------------

exports.downloadImportTemplate = async (req, res, next) => {
    try {
        const { format = 'excel' } = req.query;
        if (!['excel', 'csv'].includes(format)) return next(new ErrorHandler('Invalid format. Use excel or csv', 400));

        const sampleData = buildSampleRows();

        if (format === 'excel') {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(sampleData);
            XLSX.utils.book_append_sheet(wb, ws, 'Questions');
            const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=question_import_template.xlsx');
            return res.send(buffer);
        }

        const headers = Object.keys(sampleData[0]);
        const csvContent = [headers.map((h) => `"${h}"`).join(','), ...sampleData.map((row) => headers.map((h) => `"${row[h]}"`).join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=question_import_template.csv');
        res.send(csvContent);
    } catch (err) {
        console.error('Download educator import template error:', err);
        return next(new ErrorHandler('Failed to generate template', 500));
    }
};

exports.parseImportFile = async (req, res, next) => {
    if (!req.file) return next(new ErrorHandler('No file uploaded', 400));
    const filePath = req.file.path;
    try {
        const fileType = req.file.mimetype.includes('csv') ? 'csv' : 'excel';
        const result = await parseAndValidateFile(filePath, fileType);
        res.status(200).json({
            success: true,
            data: { totalRows: result.totalRows, validQuestions: result.validQuestions, errors: result.errors }
        });
    } catch (err) {
        console.error('Parse educator import file error:', err);
        next(new ErrorHandler('Failed to parse file', 500));
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
};
