/**
 * Lets a private-educator-mode Educator create and manage their own
 * standalone, student-visible Test Series — separate from the course
 * pricing flow (courseController.js, which auto-creates a series scoped to
 * one course) and separate from the private quiz bank
 * (quizCategoryHelpers.getOrCreateQuizBank, always hidden from students).
 * A series created here shows up directly on the student Test Series page
 * (TestSeriesController.js / studentDynamicTestRoutes.js) once it has
 * question content, gated the same way course pricing already is: only an
 * institution in 'private_educator' pricing_mode may do this.
 */
const ErrorHandler = require('../../utils/default/errorHandler');
const { TestSeries, Category, Question, Course, Subscription, Institution } = require('../../models');
const { Op } = require('sequelize');

async function requirePrivateEducatorMode(educator) {
    const institution = educator.institution_id
        ? await Institution.findByPk(educator.institution_id, { attributes: ['id', 'pricing_mode'] })
        : null;
    return (institution?.pricing_mode || 'coaching_center') === 'private_educator';
}

async function getCourseLinkedTestSeriesIds() {
    const linked = await Course.findAll({
        where: { test_series_id: { [Op.ne]: null } },
        attributes: ['test_series_id'],
        raw: true,
    });
    return linked.map((c) => c.test_series_id);
}

// GET /educator/test-series — list my own standalone series (excludes my quiz bank and any course-backing series)
exports.listMyTestSeries = async (req, res, next) => {
    try {
        const courseLinkedIds = await getCourseLinkedTestSeriesIds();
        const series = await TestSeries.findAll({
            where: {
                educator_id: req.educator.id,
                is_quiz_bank: false,
                ...(courseLinkedIds.length > 0 ? { id: { [Op.notIn]: courseLinkedIds } } : {}),
            },
            order: [['created_at', 'DESC']],
        });

        const withCounts = await Promise.all(series.map(async (s) => {
            const categoriesCount = await Category.count({
                where: { test_series_id: s.id, is_active: true, parent_category_id: null },
            });
            return { ...s.toJSON(), categoriesCount };
        }));

        res.status(200).json({ success: true, data: withCounts });
    } catch (err) {
        console.error('List educator test series error:', err);
        return next(new ErrorHandler('Failed to fetch test series', 500));
    }
};

// POST /educator/test-series
exports.createTestSeries = async (req, res, next) => {
    try {
        if (!(await requirePrivateEducatorMode(req.educator))) {
            return next(new ErrorHandler('Only private-educator institutions can create their own test series', 400));
        }

        const { title, description, price } = req.body;
        if (!title || !title.trim()) return next(new ErrorHandler('Title is required', 400));

        const numericPrice = price !== undefined && price !== null && price !== '' ? Number(price) : 0;
        if (isNaN(numericPrice) || numericPrice < 0) {
            return next(new ErrorHandler('A valid, non-negative price is required', 400));
        }

        const testSeries = await TestSeries.create({
            name: title.trim(),
            description: description?.trim() || null,
            pricing_type: numericPrice > 0 ? 'paid' : 'free',
            price: numericPrice,
            currency: 'INR',
            institution_id: req.educator.institution_id || null,
            educator_id: req.educator.id,
            is_active: true,
        });

        res.status(201).json({ success: true, message: 'Test series created successfully', data: testSeries });
    } catch (err) {
        console.error('Create educator test series error:', err);
        return next(new ErrorHandler('Failed to create test series', 500));
    }
};

// PUT /educator/test-series/:uuid
exports.updateTestSeries = async (req, res, next) => {
    try {
        const series = await TestSeries.findOne({
            where: { uuid: req.params.uuid, educator_id: req.educator.id, is_quiz_bank: false },
        });
        if (!series) return next(new ErrorHandler('Test series not found', 404));

        const { title, description, price, is_active } = req.body;
        const updates = {};
        if (title !== undefined) {
            if (!title.trim()) return next(new ErrorHandler('Title cannot be empty', 400));
            updates.name = title.trim();
        }
        if (description !== undefined) updates.description = description?.trim() || null;
        if (is_active !== undefined) updates.is_active = !!is_active;
        if (price !== undefined && price !== null && price !== '') {
            if (!(await requirePrivateEducatorMode(req.educator))) {
                return next(new ErrorHandler('Only private-educator institutions can price their own test series', 400));
            }
            const numericPrice = Number(price);
            if (isNaN(numericPrice) || numericPrice < 0) {
                return next(new ErrorHandler('A valid, non-negative price is required', 400));
            }
            updates.price = numericPrice;
            updates.pricing_type = numericPrice > 0 ? 'paid' : 'free';
        }

        await series.update(updates);
        res.status(200).json({ success: true, message: 'Test series updated successfully', data: series });
    } catch (err) {
        console.error('Update educator test series error:', err);
        return next(new ErrorHandler('Failed to update test series', 500));
    }
};

// DELETE /educator/test-series/:uuid
exports.deleteTestSeries = async (req, res, next) => {
    try {
        const series = await TestSeries.findOne({
            where: { uuid: req.params.uuid, educator_id: req.educator.id, is_quiz_bank: false },
        });
        if (!series) return next(new ErrorHandler('Test series not found', 404));

        const activeSubscriptions = await Subscription.count({ where: { test_series_id: series.id, status: 'completed' } });
        if (activeSubscriptions > 0) {
            return next(new ErrorHandler('Cannot delete a test series with active student subscriptions', 400));
        }

        const categoryIds = (await Category.findAll({ where: { test_series_id: series.id }, attributes: ['id'] })).map((c) => c.id);
        if (categoryIds.length > 0) {
            await Question.destroy({ where: { category_id: categoryIds } });
            await Category.destroy({ where: { test_series_id: series.id } });
        }
        await series.destroy();

        res.status(200).json({ success: true, message: 'Test series deleted successfully' });
    } catch (err) {
        console.error('Delete educator test series error:', err);
        return next(new ErrorHandler('Failed to delete test series', 500));
    }
};
