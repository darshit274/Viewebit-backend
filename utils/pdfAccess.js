// Resolves whether a student may actually receive a PDF's bytes — the
// content-serving endpoints (pdfController.getPdfBase64/getPdfDownloadUrl/
// viewPdf) previously served any PDF to anyone who knew or guessed its id,
// with no entitlement check at all. This centralizes the four ways a PDF
// can be locked/unlocked so those endpoints, not just the listing UIs, can
// enforce it.
const { PdfCategory, Lesson, CourseModule, Course, TestSeries, Subscription, sequelize } = require('../models');
const { Op } = require('sequelize');

async function resolveRootPdfCategory(categoryId) {
    let node = await PdfCategory.findByPk(categoryId);
    while (node && node.parent_category_id !== null) {
        node = await PdfCategory.findByPk(node.parent_category_id);
    }
    return node;
}

async function hasCompletedSubscription(where) {
    const subscription = await Subscription.findOne({
        where: {
            status: 'completed',
            [Op.or]: [
                { expiry_date: null },
                { expiry_date: { [Op.gt]: new Date() } }
            ],
            ...where
        }
    });
    return !!subscription;
}

async function resolvePdfAccess(pdf, userId) {
    if (pdf.access_level === 'free' || pdf.is_free) return true;

    // Course-attached PDF (uploaded inline as a lesson's document): the
    // lesson's own free-preview flag, or its course's purchase state, is
    // the sole authority — never fall through to this PDF's own category
    // pricing, which for a course upload is just an organizational folder.
    const lesson = await Lesson.findOne({
        where: { pdf_id: pdf.id },
        include: [{
            model: CourseModule,
            as: 'module',
            include: [{ model: Course, as: 'course', include: [{ model: TestSeries, as: 'testSeries' }] }]
        }]
    });
    if (lesson) {
        if (lesson.is_free_preview) return true;
        const course = lesson.module?.course;
        if (course) {
            if (!course.testSeries || course.testSeries.pricing_type === 'free') return true;
            if (!userId) return false;
            return hasCompletedSubscription({ user_id: userId, test_series_id: course.testSeries.id });
        }
    }

    if (!userId) return false;

    // Single-PDF purchase (planType 'pdf' / 'pdf_purchase')
    const directPurchase = await hasCompletedSubscription({
        user_id: userId,
        [Op.and]: [sequelize.json('metadata.pdf_id', pdf.id)]
    });
    if (directPurchase) return true;

    // Whole-category purchase (planType 'pdf_category') — pricing and the
    // purchase itself both key off the ROOT category, never a sub-category.
    if (pdf.category_id) {
        const root = await resolveRootPdfCategory(pdf.category_id);
        if (root) {
            if (root.pricing_type === 'free') return true;
            const categoryPurchase = await hasCompletedSubscription({
                user_id: userId,
                [Op.and]: [sequelize.json('metadata.pdf_category_id', root.id)]
            });
            if (categoryPurchase) return true;
        }
    }

    // PDF directly linked to a TestSeries (Pdfs.test_series_id)
    if (pdf.test_series_id) {
        const seriesPurchase = await hasCompletedSubscription({ user_id: userId, test_series_id: pdf.test_series_id });
        if (seriesPurchase) return true;
    }

    return false;
}

module.exports = { resolvePdfAccess };
