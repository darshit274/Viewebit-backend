const ErrorHandler = require('../../utils/default/errorHandler');
const { Course, Educator, Institution, TestSeries, sequelize } = require('../../models');

exports.getCourses = async (req, res, next) => {
    try {
        const courses = await Course.findAll({
            include: [
                {
                    model: Educator,
                    as: 'educator',
                    attributes: ['id', 'name', 'email'],
                    include: [{ model: Institution, as: 'institution', attributes: ['id', 'name', 'pricing_mode'] }]
                },
                { model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name', 'pricing_type', 'price', 'currency'] }
            ],
            order: [['created_at', 'DESC']]
        });
        res.status(200).json({ success: true, data: courses });
    } catch (err) {
        console.error('Get admin courses error:', err);
        return next(new ErrorHandler('Failed to fetch courses', 500));
    }
};

exports.setCoursePrice = async (req, res, next) => {
    let transaction;
    try {
        const { uuid } = req.params;
        const { price } = req.body;
        if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
            return next(new ErrorHandler('A valid, non-negative price is required', 400));
        }

        const course = await Course.findOne({
            where: { uuid },
            include: [
                { model: Educator, as: 'educator', include: [{ model: Institution, as: 'institution' }] },
                { model: TestSeries, as: 'testSeries' }
            ]
        });
        if (!course) return next(new ErrorHandler('Course not found', 404));

        const pricingMode = course.educator?.institution?.pricing_mode || 'coaching_center';
        if (pricingMode !== 'coaching_center') {
            return next(new ErrorHandler('Only coaching-center-mode courses can have their price set by an admin', 400));
        }

        const numericPrice = Number(price);
        const pricingType = numericPrice > 0 ? 'paid' : 'free';

        if (course.testSeries) {
            // A series the educator created and still owns stays theirs — an
            // admin must not silently take it over through this endpoint, even
            // if the institution has since been switched to coaching_center.
            if (course.testSeries.educator_id) {
                return next(new ErrorHandler('This course is linked to an educator-owned test series and cannot be priced by an admin', 400));
            }
            await course.testSeries.update({ price: numericPrice, pricing_type: pricingType });
        } else {
            // Create-then-link has to be atomic so a failure can't leave an
            // orphaned series, and two concurrent requests can't each create
            // one for the same course.
            transaction = await sequelize.transaction();
            const newSeries = await TestSeries.create({
                name: course.title,
                pricing_type: pricingType,
                price: numericPrice,
                currency: 'INR',
                institution_id: course.educator?.institution_id || null
            }, { transaction });
            await course.update({ test_series_id: newSeries.id }, { transaction });
            await transaction.commit();
        }

        res.status(200).json({ success: true, message: 'Course price updated successfully' });
    } catch (err) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error('Set course price error:', err);
        return next(new ErrorHandler('Failed to set course price', 500));
    }
};
