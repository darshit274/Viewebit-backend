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

/** Finds the live Course that owns a PDF's root category, if any — a
 * course's auto-created PDF folder (Course.pdf_category_id) is pure
 * organizational plumbing with no pricing intent of its own (it's created
 * with the pricing_type default, 'free'), so its real gate must be the
 * course's own purchase state, never the folder's own (meaningless)
 * pricing_type or the PDF's own (also-defaulted) access_level. */
async function resolveCourseForPdf(pdf) {
    if (!pdf.category_id) return null;
    const root = await resolveRootPdfCategory(pdf.category_id);
    if (!root) return null;
    return Course.findOne({ where: { pdf_category_id: root.id }, include: [{ model: TestSeries, as: 'testSeries' }] });
}

async function resolveCourseAccess(course, userId) {
    if (!course.testSeries || course.testSeries.pricing_type === 'free') return true;
    if (!userId) return false;
    return hasCompletedSubscription({ user_id: userId, test_series_id: course.testSeries.id });
}

async function resolvePdfAccess(pdf, userId) {
    // Course-attached PDF (uploaded inline as a lesson's document): the
    // lesson's own free-preview flag, or its course's purchase state, is
    // the sole authority — checked before any access_level/is_free shortcut,
    // since those are meaningless defaults for a course upload.
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
        if (course) return resolveCourseAccess(course, userId);
    }

    // PDF uploaded inline into a course's own PDF folder (PDF Library tab,
    // not a lesson) — same authority as above, checked before the generic
    // category-pricing fallback below.
    const course = await resolveCourseForPdf(pdf);
    if (course) return resolveCourseAccess(course, userId);

    if (pdf.access_level === 'free' || pdf.is_free) return true;

    // Whole-category purchase (planType 'pdf_category') — pricing and the
    // purchase itself both key off the ROOT category, never a sub-category.
    if (pdf.category_id) {
        const root = await resolveRootPdfCategory(pdf.category_id);
        if (root) {
            if (root.pricing_type === 'free') return true;
            if (!userId) return false;
            const categoryPurchase = await hasCompletedSubscription({
                user_id: userId,
                [Op.and]: [sequelize.json('metadata.pdf_category_id', root.id)]
            });
            if (categoryPurchase) return true;
        }
    }

    if (!userId) return false;

    // Single-PDF purchase (planType 'pdf' / 'pdf_purchase')
    const directPurchase = await hasCompletedSubscription({
        user_id: userId,
        [Op.and]: [sequelize.json('metadata.pdf_id', pdf.id)]
    });
    if (directPurchase) return true;

    // PDF directly linked to a TestSeries (Pdfs.test_series_id)
    if (pdf.test_series_id) {
        const seriesPurchase = await hasCompletedSubscription({ user_id: userId, test_series_id: pdf.test_series_id });
        if (seriesPurchase) return true;
    }

    return false;
}

module.exports = { resolvePdfAccess, resolveCourseForPdf, resolveRootPdfCategory };
