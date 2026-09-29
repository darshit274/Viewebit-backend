'use strict';

// One-off local verification for utils/pdfAccess.js — exercises all four
// entitlement paths against synthetic rows, then cleans them up. Read-only
// verification of the resolver logic; not meant to be committed long-term.
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { resolvePdfAccess } = require('../utils/pdfAccess');

const STUDENT_UUID = 'a0e80a36-e96a-485f-b393-5140157f5bd6'; // darsh1234p@gmail.com, seeded earlier
const COURSE_UUID = 'f0db01f6-2d80-45af-a276-c60ef654cff7'; // Complete Quantitative Aptitude Mastery (priced ₹100 in this session)

function assert(label, actual, expected) {
  const pass = actual === expected;
  console.log(`${pass ? '✅' : '❌'} ${label}: expected ${expected}, got ${actual}`);
  return pass;
}

async function run() {
  const cleanup = [];
  let allPassed = true;

  try {
    const course = await db.Course.findOne({ where: { uuid: COURSE_UUID } });
    const module = await db.CourseModule.findOne({ where: { course_id: course.id }, order: [['display_order', 'ASC']] });

    const makePdf = async (overrides = {}) => {
      const pdf = await db.Pdfs.create({
        title: 'Test PDF ' + uuidv4().slice(0, 8),
        file_path: '/tmp/does-not-need-to-exist.pdf',
        original_filename: 'test.pdf',
        file_size: 1,
        access_level: 'premium',
        is_free: false,
        ...overrides
      });
      cleanup.push(() => pdf.destroy());
      return pdf;
    };

    // --- 1. Free PDF: always accessible ---
    const freePdf = await makePdf({ access_level: 'free', is_free: true });
    allPassed &= assert('Free PDF, no login', await resolvePdfAccess(freePdf, null), true);

    // --- 2. Course-lesson PDF, locked (paid course, not purchased) ---
    const lockedPdf = await makePdf();
    const lockedLesson = await db.Lesson.create({
      course_module_id: module.id,
      title: 'Locked doc lesson',
      lesson_type: 'document',
      pdf_id: lockedPdf.id,
      is_free_preview: false,
      display_order: 999
    });
    cleanup.push(() => lockedLesson.destroy());
    allPassed &= assert('Course PDF, unpurchased paid course, no login', await resolvePdfAccess(lockedPdf, null), false);
    allPassed &= assert('Course PDF, unpurchased paid course, logged-in non-buyer', await resolvePdfAccess(lockedPdf, STUDENT_UUID), false);

    // --- 3. Course-lesson PDF, free-preview lesson: always accessible ---
    const previewPdf = await makePdf();
    const previewLesson = await db.Lesson.create({
      course_module_id: module.id,
      title: 'Free preview doc lesson',
      lesson_type: 'document',
      pdf_id: previewPdf.id,
      is_free_preview: true,
      display_order: 1000
    });
    cleanup.push(() => previewLesson.destroy());
    allPassed &= assert('Course PDF, free-preview lesson, no login', await resolvePdfAccess(previewPdf, null), true);

    // --- 4. Course-lesson PDF, course purchased: accessible ---
    const purchasedSub = await db.Subscription.create({
      user_id: STUDENT_UUID,
      test_series_id: course.test_series_id,
      transaction_id: 'verify-' + uuidv4(),
      amount_paid: 100,
      status: 'completed',
      purchase_date: new Date(),
      expiry_date: null
    });
    cleanup.push(() => purchasedSub.destroy());
    allPassed &= assert('Course PDF, course purchased', await resolvePdfAccess(lockedPdf, STUDENT_UUID), true);

    // --- 5. Direct single-PDF purchase ---
    const directPdf = await makePdf();
    allPassed &= assert('Standalone PDF, before purchase', await resolvePdfAccess(directPdf, STUDENT_UUID), false);
    const directSub = await db.Subscription.create({
      user_id: STUDENT_UUID,
      test_series_id: null,
      transaction_id: 'verify-' + uuidv4(),
      amount_paid: 50,
      status: 'completed',
      purchase_date: new Date(),
      expiry_date: null,
      metadata: { plan_type: 'pdf', pdf_id: directPdf.id }
    });
    cleanup.push(() => directSub.destroy());
    allPassed &= assert('Standalone PDF, after direct purchase', await resolvePdfAccess(directPdf, STUDENT_UUID), true);

    // --- 6. Whole PDF-category purchase ---
    const rootCategory = await db.PdfCategory.create({ name: 'Verify Root ' + uuidv4().slice(0, 6), pricing_type: 'paid', price: 200, node_type: 'pdf_holder', hierarchy_level: 0, parent_category_id: null });
    cleanup.push(() => rootCategory.destroy());
    const categoryPdf = await makePdf({ category_id: rootCategory.id });
    allPassed &= assert('Category PDF, before category purchase', await resolvePdfAccess(categoryPdf, STUDENT_UUID), false);
    const categorySub = await db.Subscription.create({
      user_id: STUDENT_UUID,
      test_series_id: null,
      transaction_id: 'verify-' + uuidv4(),
      amount_paid: 200,
      status: 'completed',
      purchase_date: new Date(),
      expiry_date: null,
      metadata: { plan_type: 'pdf_category', pdf_category_id: rootCategory.id }
    });
    cleanup.push(() => categorySub.destroy());
    allPassed &= assert('Category PDF, after category purchase', await resolvePdfAccess(categoryPdf, STUDENT_UUID), true);

    // --- 7. Course PDF-root folder hidden from student browsing ---
    const coursePdfRoot = await db.PdfCategory.create({ name: 'Course PDF Root ' + uuidv4().slice(0, 6), pricing_type: 'free', node_type: 'pdf_holder', hierarchy_level: 0, parent_category_id: null });
    cleanup.push(() => coursePdfRoot.destroy());
    await course.update({ pdf_category_id: coursePdfRoot.id });
    cleanup.push(() => course.update({ pdf_category_id: null }));

    const pdfHierarchyController = require('../controllers/AdminController/pdfHierarchyController');
    let rootsResponse;
    const fakeRes = { json: (data) => { rootsResponse = data; } };
    await pdfHierarchyController.studentGetRootCategories({}, fakeRes, (e) => { throw e; });
    const leaked = rootsResponse.data.some((c) => c.id === coursePdfRoot.id);
    allPassed &= assert('Course PDF root hidden from student root-category listing', leaked, false);

    console.log(allPassed ? '\n✅ ALL CHECKS PASSED' : '\n❌ SOME CHECKS FAILED');
  } finally {
    for (const fn of cleanup.reverse()) {
      await fn().catch((e) => console.error('cleanup error:', e.message));
    }
    await db.sequelize.close();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
