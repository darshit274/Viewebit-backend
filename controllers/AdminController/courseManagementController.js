const ErrorHandler = require('../../utils/default/errorHandler');
const { Course, Educator, Institution, TestSeries } = require('../../models');

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
            await course.testSeries.update({ price: numericPrice, pricing_type: pricingType });
        } else {
            const newSeries = await TestSeries.create({
                name: course.title,
                pricing_type: pricingType,
                price: numericPrice,
                currency: 'INR',
                institution_id: course.educator?.institution_id || null
            });
            await course.update({ test_series_id: newSeries.id });
        }

        res.status(200).json({ success: true, message: 'Course price updated successfully' });
    } catch (err) {
        console.error('Set course price error:', err);
        return next(new ErrorHandler('Failed to set course price', 500));
    }
};
