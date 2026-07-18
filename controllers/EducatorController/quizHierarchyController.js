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
const ErrorHandler = require('../../utils/default/errorHandler');
const { Category, Question, TestSeries, Educator, sequelize } = require('../../models');

async function getOrCreateQuizBank(educator) {
    if (educator.quiz_bank_test_series_id) {
        const existing = await TestSeries.findByPk(educator.quiz_bank_test_series_id);
        if (existing) return existing;
    }

    const testSeries = await TestSeries.create({
        name: `${educator.name} — Quiz Bank`,
        description: 'Private container for this educator\'s own quiz categories. Not shown to students directly.',
        is_active: true,
        pricing_type: 'free'
    });

    await Educator.update({ quiz_bank_test_series_id: testSeries.id }, { where: { id: educator.id } });
    return testSeries;
}

const findOwnedCategory = async (categoryUuid, educatorId) => {
    return Category.findOne({ where: { uuid: categoryUuid, educator_id: educatorId } });
};

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

        const siblingMax = await Category.findOne({
            attributes: [[sequelize.fn('MAX', sequelize.col('display_order')), 'maxOrder']],
            where: { test_series_id: testSeriesId, parent_category_id: parentCategory ? parentCategory.id : null },
            raw: true
        });
        const nextDisplayOrder = (siblingMax?.maxOrder || 0) + 1;

        const category = await Category.create({
            test_series_id: testSeriesId,
            parent_category_id: parentCategory ? parentCategory.id : null,
            educator_id: req.educator.id,
            name: name.trim(),
            description: description?.trim() || null,
            hierarchy_level: hierarchyLevel,
            node_type: 'unset',
            display_order: nextDisplayOrder,
            negative_marking_enabled: negative_marking_enabled || false,
            negative_marks_per_wrong: negative_marks_per_wrong || 0.25,
            test_duration_minutes: test_duration_minutes || 60
        });

        if (parentCategory && parentCategory.node_type === 'unset') {
            await parentCategory.update({ node_type: 'container' });
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
