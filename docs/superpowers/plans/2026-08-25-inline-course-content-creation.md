# Inline Course Content Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an educator create PDF, Quiz (manual or Excel/CSV import), Assignment, and Video/Audio content directly inside the Course Builder's "Add Content" popup, instead of having to create the material on a separate page first.

**Architecture:** Backend adds course-scoped "auto-provisioned" container categories (mirroring the existing per-educator quiz-bank pattern) so uploads/creates never need a folder picker, plus a handful of new educator-scoped endpoints that reuse existing models unchanged. Frontend adds a Create-New/Use-Existing toggle (Upload/URL toggle for media) to each section of `LessonContentModal`, backed by small new components that reuse form fields already proven on the standalone library pages.

**Tech Stack:** Node/Express/Sequelize (MySQL) backend, React 19 + TypeScript (Vite) frontend. This repo has no automated test runner (`npm test` is a stub) — every task's verification step is a real, runnable check: a `node -e` script against the live models/DB, a `curl` call, or `tsc --noEmit`, matching how this project has been verified throughout this session. The final task is a full browser E2E pass.

**Spec:** `docs/superpowers/specs/2026-08-25-inline-course-content-creation-design.md`

## Global Constraints

- Branch: `new-features` in both `Viewebit-backend` and `Viewebit-EducatorPanel` — never `main`/`master`.
- Do not commit or push unless the user explicitly asks for it in that turn.
- Local dev only — production is in troubleshoot and out of scope for this work.
- Every new endpoint requires `educatorAuth` and re-verifies ownership by `educator_id` on every row touched (course, category, PDF), matching every existing educator-scoped endpoint.
- No schema changes to `Pdfs`, `Assignment`, `Category`, `Question`, or `Lesson` — only two new nullable columns on `courses`.
- Video upload cap: 500MB. Audio upload cap: 100MB. Both env-overridable, following the `PDF_UPLOAD_MAX_SIZE_MB` pattern in `utils/uploadConfig.js`.
- Bulk question creation is transactional — a bad row rolls back the whole batch.
- `parse-import` never writes to the DB.

---

## File Structure

**Backend (`Viewebit-backend`):**
- `migrations/20260825000001-add-content-category-roots-to-courses.js` — new
- `models/Course.js` — modify (2 fields + 2 associations)
- `utils/quizCategoryHelpers.js` — new: `getOrCreateQuizBank`, `findOwnedCategory`, `createChildCategory` (extracted, reused by both quiz controllers)
- `controllers/EducatorController/quizHierarchyController.js` — modify: use the extracted helpers, add `bulkCreateQuestions`, `downloadImportTemplate`, `parseImportFile`
- `routes/EducatorRoutes/quizHierarchyRoutes.js` — modify: 3 new routes
- `utils/questionImportParser.js` — new: extracted `TEMPLATE_HEADERS`, `SAMPLE_ROWS`, `validateQuestionRow`, `parseAndValidateFile`
- `controllers/AdminController/questionImportController.js` — modify: use the extracted parser (behavior unchanged)
- `utils/coursePdfUpload.js` — new: multer config for course-scoped PDF upload (mirrors `utils/pdfUpload.js`)
- `utils/lessonMediaUpload.js` — new: multer config for video/audio upload
- `utils/uploadConfig.js` — modify: add `VIDEO_UPLOAD_MAX_SIZE_MB/BYTES`, `AUDIO_UPLOAD_MAX_SIZE_MB/BYTES`
- `controllers/EducatorController/courseController.js` — modify: add `findOrCreateCoursePdfRoot`, `findOrCreateCourseQuizRoot` helpers + `uploadCoursePdf`, `createCourseQuizCategory`, `uploadLessonMedia` handlers
- `routes/EducatorRoutes/courseRoutes.js` — modify: 3 new routes

**Frontend (`Viewebit-EducatorPanel`):**
- `src/services/courses.ts` — modify: `uploadCoursePdf`, `createCourseQuizCategory`, `uploadLessonMedia`
- `src/services/quizHierarchy.ts` — modify: `bulkCreateQuestions`, `importTemplateUrl`, `parseImportFile`
- `src/components/quizzes/QuestionFieldsForm.tsx` — new: extracted shared MCQ form
- `src/pages/quizzes/QuizCategoriesPage.tsx` — modify: use `QuestionFieldsForm` (behavior unchanged)
- `src/components/courses/PdfQuickUpload.tsx` — new
- `src/components/courses/QuizQuickBuilder.tsx` — new
- `src/components/courses/LessonContentModal.tsx` — modify: wire in all of the above

---

### Task 1: `courses` gets auto-provisioned category roots

**Files:**
- Create: `migrations/20260825000001-add-content-category-roots-to-courses.js`
- Modify: `models/Course.js`

**Interfaces:**
- Produces: `Course.pdf_category_id: number | null`, `Course.quiz_category_id: number | null` — read/written by Task 3 and Task 7's helpers.

- [ ] **Step 1: Write the migration**

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('courses', 'pdf_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'pdf_categories', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Auto-created root PdfCategory for this course\'s inline PDF uploads'
    });
    await queryInterface.addColumn('courses', 'quiz_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'categories', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Auto-created root Category for this course\'s inline quiz creation'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('courses', 'pdf_category_id');
    await queryInterface.removeColumn('courses', 'quiz_category_id');
  }
};
```

- [ ] **Step 2: Run it**

```bash
cd "Viewebit-backend" && npx sequelize-cli db:migrate
```
Expected: `== 20260825000001-add-content-category-roots-to-courses: migrated`

- [ ] **Step 3: Verify the columns exist**

```bash
node -e "const {sequelize}=require('./models'); sequelize.query('DESCRIBE courses').then(([rows])=>{console.log(rows.filter(r=>r.Field.includes('category_id')));process.exit(0);});"
```
Expected: two rows, `pdf_category_id` and `quiz_category_id`, both `YES` nullable.

- [ ] **Step 4: Add the fields and associations to the model**

In `models/Course.js`, add to `Course.init({...})` (after `thumbnail_url`):

```js
    pdf_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Auto-created root PdfCategory for this course\'s inline PDF uploads'
    },
    quiz_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Auto-created root Category for this course\'s inline quiz creation'
    },
```

And inside `static associate(models)`, after the `CourseCategoryLink` block:

```js
      if (models.PdfCategory) {
        Course.belongsTo(models.PdfCategory, { foreignKey: 'pdf_category_id', as: 'pdfCategoryRoot' });
      }
      if (models.Category) {
        Course.belongsTo(models.Category, { foreignKey: 'quiz_category_id', as: 'quizCategoryRoot' });
      }
```

- [ ] **Step 5: Verify the model loads cleanly**

```bash
node -e "const {Course}=require('./models'); console.log(Object.keys(Course.rawAttributes).filter(k=>k.includes('category_id')));"
```
Expected: `[ 'pdf_category_id', 'quiz_category_id' ]` (plus no thrown error — confirms associations resolved).

- [ ] **Step 6: Commit**

```bash
git add migrations/20260825000001-add-content-category-roots-to-courses.js models/Course.js
git commit -m "feat: add auto-provisioned PDF/quiz category roots to courses"
```

---

### Task 2: Extract shared quiz-category helpers

**Files:**
- Create: `utils/quizCategoryHelpers.js`
- Modify: `controllers/EducatorController/quizHierarchyController.js`

**Interfaces:**
- Produces: `getOrCreateQuizBank(educator): Promise<TestSeries>`, `findOwnedCategory(categoryUuid, educatorId): Promise<Category|null>`, `createChildCategory({ parentCategory, testSeriesId, hierarchyLevel, educatorId, name, description }): Promise<Category>` — consumed by Task 3 (course quiz root) and unchanged by `quizHierarchyController.createCategory`.
- Consumes: nothing new — pure extraction of existing logic in `quizHierarchyController.js` lines 17-36 and the category-creation body of `createCategory` (lines 102-121).

- [ ] **Step 1: Create the shared helpers module**

```js
// utils/quizCategoryHelpers.js
const { Category, TestSeries, Educator, sequelize } = require('../models');

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

async function createChildCategory({ parentCategory, testSeriesId, hierarchyLevel, educatorId, name, description, nodeType }) {
    const siblingMax = await Category.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('display_order')), 'maxOrder']],
        where: { test_series_id: testSeriesId, parent_category_id: parentCategory ? parentCategory.id : null },
        raw: true
    });
    const nextDisplayOrder = (siblingMax?.maxOrder || 0) + 1;

    const category = await Category.create({
        test_series_id: testSeriesId,
        parent_category_id: parentCategory ? parentCategory.id : null,
        educator_id: educatorId,
        name: name.trim(),
        description: description?.trim() || null,
        hierarchy_level: hierarchyLevel,
        node_type: nodeType || 'unset',
        display_order: nextDisplayOrder,
        negative_marking_enabled: false,
        negative_marks_per_wrong: 0.25,
        test_duration_minutes: 60
    });

    if (parentCategory && parentCategory.node_type === 'unset') {
        await parentCategory.update({ node_type: 'container' });
    }

    return category;
}

module.exports = { getOrCreateQuizBank, findOwnedCategory, createChildCategory };
```

- [ ] **Step 2: Refactor `quizHierarchyController.js` to use it**

Replace lines 14-36 (the `require`, `getOrCreateQuizBank`, `findOwnedCategory` definitions) with:

```js
const ErrorHandler = require('../../utils/default/errorHandler');
const { Category, Question, sequelize } = require('../../models');
const { getOrCreateQuizBank, findOwnedCategory, createChildCategory } = require('../../utils/quizCategoryHelpers');
```

Replace the body of `exports.createCategory` (lines 78-132) with:

```js
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
```

Leave everything else in the file (`updateCategory`, `deleteCategory`, `createQuestion`, `updateQuestion`, `deleteQuestion`, `getRootCategories`, `getCategoryContent`) untouched.

- [ ] **Step 3: Verify no behavior change — re-run the existing manual create-category flow**

```bash
node -e "
const { Educator } = require('./models');
const { findOwnedCategory } = require('./utils/quizCategoryHelpers');
Educator.findOne().then(async (ed) => {
  if (!ed) { console.log('no educator in DB — skip'); process.exit(0); }
  console.log('helper module loads and findOwnedCategory runs:', await findOwnedCategory('00000000-0000-0000-0000-000000000000', ed.id));
  process.exit(0);
});
"
```
Expected: prints `null` (no matching category) with no thrown error — confirms the extracted module wires up correctly against the real DB connection.

- [ ] **Step 4: Restart the backend dev server and smoke-test the existing Quiz Categories page**

Restart `npm run dev` in `Viewebit-backend`, then in the Educator Panel UI (already running) open **Quiz Categories → New Category**, create one, confirm it appears — this exercises the refactored `createCategory` end-to-end with zero behavior change expected.

- [ ] **Step 5: Commit**

```bash
git add utils/quizCategoryHelpers.js controllers/EducatorController/quizHierarchyController.js
git commit -m "refactor: extract quiz-category helpers for reuse by course-scoped quiz creation"
```

---

### Task 3: Course-scoped quiz category creation

**Files:**
- Modify: `controllers/EducatorController/courseController.js`
- Modify: `routes/EducatorRoutes/courseRoutes.js`

**Interfaces:**
- Consumes: `getOrCreateQuizBank`, `createChildCategory` from `utils/quizCategoryHelpers.js` (Task 2); `Course.quiz_category_id` (Task 1).
- Produces: `POST /educator/courses/:courseUuid/quiz-categories` → `{ success, data: { id, uuid, name, node_type } }`, consumed by the frontend `QuizQuickBuilder` (Task 13).

- [ ] **Step 1: Add the course-quiz-root helper and endpoint to `courseController.js`**

Near the top of the file, alongside the other requires, add:

```js
const { getOrCreateQuizBank, createChildCategory } = require('../../utils/quizCategoryHelpers');
```

Add this helper (near `resolveOwnedCategoryIds` / other course-taxonomy helpers already in the file):

```js
async function findOrCreateCourseQuizRoot(course, educator) {
    if (course.quiz_category_id) {
        const existing = await Category.findByPk(course.quiz_category_id);
        if (existing) return existing;
    }

    const quizBank = await getOrCreateQuizBank(educator);
    const root = await createChildCategory({
        parentCategory: null,
        testSeriesId: quizBank.id,
        hierarchyLevel: 0,
        educatorId: educator.id,
        name: `${course.title} — Course Quizzes`,
        description: `Auto-created container for quizzes created inline from the "${course.title}" course builder.`,
        nodeType: 'container'
    });

    await course.update({ quiz_category_id: root.id });
    return root;
}
```

(`Category` must already be imported in this file for the quiz-related dropdown endpoints — verify with `grep -n "const.*Category.*require\|require('../../models')" controllers/EducatorController/courseController.js` and add `Category` to the destructured models import if it's missing.)

Add the new handler (near `createLesson`/`getAvailableAssignments`):

```js
exports.createCourseQuizCategory = async (req, res, next) => {
    try {
        const { courseUuid } = req.params;
        const { name } = req.body;
        if (!name || !name.trim()) return next(new ErrorHandler('Quiz name is required', 400));

        const course = await Course.findOne({ where: { uuid: courseUuid, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found or not owned by you', 404));

        const root = await findOrCreateCourseQuizRoot(course, req.educator);
        const category = await createChildCategory({
            parentCategory: root,
            testSeriesId: root.test_series_id,
            hierarchyLevel: root.hierarchy_level + 1,
            educatorId: req.educator.id,
            name,
            description: null
        });

        res.status(201).json({
            success: true,
            data: { id: category.id, uuid: category.uuid, name: category.name, node_type: category.node_type }
        });
    } catch (err) {
        console.error('Create course quiz category error:', err);
        return next(new ErrorHandler('Failed to create quiz', 500));
    }
};
```

- [ ] **Step 2: Wire the route**

In `routes/EducatorRoutes/courseRoutes.js`, add near the other `:uuid`-scoped routes:

```js
router.post('/:courseUuid/quiz-categories', courseController.createCourseQuizCategory);
```

(Place it after the `/:uuid/thumbnail` route and before the `/modules` routes, so the more specific `:courseUuid/quiz-categories` doesn't collide with `/:uuid`.)

- [ ] **Step 3: Verify with curl against the running local backend**

First get a real educator JWT and course uuid (reuse the pattern from earlier verification in this project — read one from the DB, or grab it from the browser's localStorage while logged into the Educator Panel), then:

```bash
curl -s -X POST http://localhost:3000/api/educator/courses/<COURSE_UUID>/quiz-categories \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"Chapter 1 Quiz"}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)))"
```
Expected: `{ success: true, data: { id, uuid, name: 'Chapter 1 Quiz', node_type: 'unset' } }`.

- [ ] **Step 4: Verify the auto-root was created and cached on the course**

```bash
node -e "
const { Course, Category } = require('./models');
Course.findOne({ where: { uuid: '<COURSE_UUID>' } }).then(async (c) => {
  console.log('course.quiz_category_id:', c.quiz_category_id);
  const root = await Category.findByPk(c.quiz_category_id);
  console.log('root name/node_type:', root.name, root.node_type);
  const child = await Category.findOne({ where: { parent_category_id: root.id } });
  console.log('child:', child.name, child.node_type);
  process.exit(0);
});
"
```
Expected: `quiz_category_id` set, root named `"<course title> — Course Quizzes"` with `node_type: 'container'`, one child named `"Chapter 1 Quiz"`.

- [ ] **Step 5: Call the endpoint again for the same course and confirm the root is reused, not duplicated**

Repeat Step 3 with a different `name`, then re-run Step 4's script — `course.quiz_category_id` must be unchanged and there should now be 2 children under the same root.

- [ ] **Step 6: Commit**

```bash
git add controllers/EducatorController/courseController.js routes/EducatorRoutes/courseRoutes.js
git commit -m "feat: add course-scoped inline quiz category creation"
```

---

### Task 4: Bulk question creation endpoint

**Files:**
- Modify: `controllers/EducatorController/quizHierarchyController.js`
- Modify: `routes/EducatorRoutes/quizHierarchyRoutes.js`

**Interfaces:**
- Consumes: `findOwnedCategory` (Task 2).
- Produces: `POST /educator/quizzes/categories/:categoryUuid/questions/bulk` → `{ success, data: { created: number, questions: Question[] } }`, consumed by the frontend `QuizQuickBuilder` (Task 13) for both manual multi-question add and import confirmation.

- [ ] **Step 1: Add the handler**

In `quizHierarchyController.js`, after `exports.createQuestion`, add:

```js
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
```

- [ ] **Step 2: Wire the route**

In `routes/EducatorRoutes/quizHierarchyRoutes.js`, add after the existing `POST /categories/:categoryUuid/questions` line:

```js
router.post('/categories/:categoryUuid/questions/bulk', quizHierarchyController.bulkCreateQuestions);
```

- [ ] **Step 3: Verify success case with curl**

```bash
curl -s -X POST http://localhost:3000/api/educator/quizzes/categories/<CATEGORY_UUID>/questions/bulk \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"questions":[
    {"question_text":"2+2?","option_a":"3","option_b":"4","option_c":"5","option_d":"6","correct_answer":"B","marks":1},
    {"question_text":"Capital of France?","option_a":"Paris","option_b":"Rome","option_c":"Berlin","option_d":"Madrid","correct_answer":"A","marks":2}
  ]}'
```
Expected: `{"success":true,"data":{"created":2,"questions":[...]}}`.

- [ ] **Step 4: Verify the rollback case — one bad row rolls back the whole batch**

```bash
curl -s -X POST http://localhost:3000/api/educator/quizzes/categories/<CATEGORY_UUID>/questions/bulk \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"questions":[
    {"question_text":"Valid one","option_a":"A","option_b":"B","option_c":"C","option_d":"D","correct_answer":"A"},
    {"question_text":"Missing options","option_a":"","option_b":"B","option_c":"C","option_d":"D","correct_answer":"A"}
  ]}'
```
Expected: `{"success":false,"message":"Question 2: all four options are required"}`. Then re-run the DB check below and confirm "Valid one" was **not** inserted:

```bash
node -e "const {Question}=require('./models'); Question.findOne({where:{question_text:'Valid one'}}).then(q=>{console.log('should be null:',q);process.exit(0);});"
```

- [ ] **Step 5: Clean up test questions from Steps 3-4**

```bash
node -e "
const { Question } = require('./models');
Question.destroy({ where: { question_text: ['2+2?', 'Capital of France?', 'Valid one'] } }).then((n)=>{console.log('deleted', n); process.exit(0);});
"
```

- [ ] **Step 6: Commit**

```bash
git add controllers/EducatorController/quizHierarchyController.js routes/EducatorRoutes/quizHierarchyRoutes.js
git commit -m "feat: add transactional bulk question creation for quiz categories"
```

---

### Task 5: Extract shared question-import parser

**Files:**
- Create: `utils/questionImportParser.js`
- Modify: `controllers/AdminController/questionImportController.js`

**Interfaces:**
- Produces: `TEMPLATE_HEADERS: Record<string,string>`, `buildSampleRows(): object[]`, `validateQuestionRow(row, rowNumber, questionOrder): { errors: [], question: {} }`, `parseAndValidateFile(filePath, fileType): Promise<{isValid, totalRows, errors, validQuestions}>` — consumed by Task 6 (educator endpoints) and by the refactored Admin controller (no behavior change).

- [ ] **Step 1: Create the shared parser module**

Move (verbatim, not rewritten) `TEMPLATE_HEADERS`, the sample-data array used in `downloadTemplate`, `parseAndValidateFile`, and `validateQuestionRow` out of `controllers/AdminController/questionImportController.js` (lines 52-67 for headers, 80-113 for sample data, 264-345 for `parseAndValidateFile`, 348-469 for `validateQuestionRow`) into:

```js
// utils/questionImportParser.js
const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');

const TEMPLATE_HEADERS = {
  'Question Text (English)': 'question_text',
  'Question Text (Gujarati)': 'question_text_gujarati',
  'Option A (English)': 'option_a',
  'Option B (English)': 'option_b',
  'Option C (English)': 'option_c',
  'Option D (English)': 'option_d',
  'Option A (Gujarati)': 'option_a_gujarati',
  'Option B (Gujarati)': 'option_b_gujarati',
  'Option C (Gujarati)': 'option_c_gujarati',
  'Option D (Gujarati)': 'option_d_gujarati',
  'Correct Answer': 'correct_answer',
  'Explanation (English)': 'explanation',
  'Explanation (Gujarati)': 'explanation_gujarati',
  'Marks': 'marks'
};

function buildSampleRows() {
  return [
    {
      'Question Text (English)': 'What is the capital of Gujarat?',
      'Question Text (Gujarati)': 'ગુજરાતની રાજધાની શું છે?',
      'Option A (English)': 'Ahmedabad',
      'Option B (English)': 'Gandhinagar',
      'Option C (English)': 'Surat',
      'Option D (English)': 'Rajkot',
      'Option A (Gujarati)': 'અમદાવાદ',
      'Option B (Gujarati)': 'ગાંધીનગર',
      'Option C (Gujarati)': 'સુરત',
      'Option D (Gujarati)': 'રાજકોટ',
      'Correct Answer': 'B',
      'Explanation (English)': 'Gandhinagar is the capital city of Gujarat state in India.',
      'Explanation (Gujarati)': 'ગાંધીનગર એ ભારતના ગુજરાત રાજ્યની રાજધાની છે.',
      'Marks': 1
    },
    {
      'Question Text (English)': 'Which river flows through Ahmedabad?',
      'Question Text (Gujarati)': 'કઈ નદી અમદાવાદમાંથી વહે છે?',
      'Option A (English)': 'Narmada',
      'Option B (English)': 'Sabarmati',
      'Option C (English)': 'Tapi',
      'Option D (English)': 'Mahi',
      'Option A (Gujarati)': 'નર્મદા',
      'Option B (Gujarati)': 'સાબરમતી',
      'Option C (Gujarati)': 'તાપી',
      'Option D (Gujarati)': 'માહી',
      'Correct Answer': 'B',
      'Explanation (English)': 'The Sabarmati River flows through Ahmedabad city.',
      'Explanation (Gujarati)': 'સાબરમતી નદી અમદાવાદ શહેરમાંથી વહે છે.',
      'Marks': 1
    }
  ];
}

function validateQuestionRow(row, rowNumber, questionOrder = null) {
  const errors = [];
  const question = {};

  const hasEnglishContent = row['Question Text (English)'] && row['Question Text (English)'].toString().trim() !== '';
  const hasGujaratiContent = row['Question Text (Gujarati)'] && row['Question Text (Gujarati)'].toString().trim() !== '';

  if (!hasEnglishContent && !hasGujaratiContent) {
    errors.push({ row: rowNumber, field: 'Question Text', error: 'Question text is required in at least one language (English or Gujarati)' });
    return { errors, question };
  }

  if (hasEnglishContent) {
    ['Question Text (English)', 'Option A (English)', 'Option B (English)', 'Option C (English)', 'Option D (English)'].forEach((field) => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({ row: rowNumber, field, error: `${field} is required when providing English content` });
      }
    });
  }

  if (hasGujaratiContent) {
    ['Question Text (Gujarati)', 'Option A (Gujarati)', 'Option B (Gujarati)', 'Option C (Gujarati)', 'Option D (Gujarati)'].forEach((field) => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({ row: rowNumber, field, error: `${field} is required when providing Gujarati content` });
      }
    });
  }

  if (!row['Correct Answer'] || row['Correct Answer'].toString().trim() === '') {
    errors.push({ row: rowNumber, field: 'Correct Answer', error: 'Correct Answer is required' });
  }
  if (row['Correct Answer']) {
    const correctAnswer = row['Correct Answer'].toString().toUpperCase().trim();
    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      errors.push({ row: rowNumber, field: 'Correct Answer', error: 'Correct Answer must be A, B, C, or D' });
    }
  }

  const marks = parseInt(row['Marks'] || 1);
  if (isNaN(marks) || marks < 1 || marks > 10) {
    errors.push({ row: rowNumber, field: 'Marks', error: 'Marks must be a number between 1 and 10' });
  }

  if (errors.length === 0) {
    question.question_text = hasEnglishContent ? row['Question Text (English)'].toString().trim() : null;
    question.option_a = hasEnglishContent ? row['Option A (English)'].toString().trim() : null;
    question.option_b = hasEnglishContent ? row['Option B (English)'].toString().trim() : null;
    question.option_c = hasEnglishContent ? row['Option C (English)'].toString().trim() : null;
    question.option_d = hasEnglishContent ? row['Option D (English)'].toString().trim() : null;
    question.explanation = (hasEnglishContent && row['Explanation (English)']) ? row['Explanation (English)'].toString().trim() : null;

    question.question_text_gujarati = hasGujaratiContent ? row['Question Text (Gujarati)'].toString().trim() : null;
    question.option_a_gujarati = hasGujaratiContent ? row['Option A (Gujarati)'].toString().trim() : null;
    question.option_b_gujarati = hasGujaratiContent ? row['Option B (Gujarati)'].toString().trim() : null;
    question.option_c_gujarati = hasGujaratiContent ? row['Option C (Gujarati)'].toString().trim() : null;
    question.option_d_gujarati = hasGujaratiContent ? row['Option D (Gujarati)'].toString().trim() : null;
    question.explanation_gujarati = (hasGujaratiContent && row['Explanation (Gujarati)']) ? row['Explanation (Gujarati)'].toString().trim() : null;

    question.correct_answer = row['Correct Answer'].toString().toUpperCase().trim();
    question.marks = marks;
    question.is_active = true;
    if (questionOrder !== null) question.question_order = questionOrder;
  }

  return { errors, question };
}

async function parseAndValidateFile(filePath, fileType) {
  const errors = [];
  const questions = [];
  let totalRows = 0;

  if (fileType === 'excel') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    totalRows = jsonData.length;
    jsonData.forEach((row, index) => {
      const rowNumber = index + 2;
      const questionOrder = index + 1;
      const result = validateQuestionRow(row, rowNumber, questionOrder);
      if (result.errors.length > 0) errors.push(...result.errors);
      else questions.push(result.question);
    });

    return { isValid: errors.length === 0, totalRows, errors, validQuestions: questions };
  }

  if (fileType === 'csv') {
    return new Promise((resolve, reject) => {
      const csvData = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => csvData.push(row))
        .on('end', () => {
          totalRows = csvData.length;
          csvData.forEach((row, index) => {
            const rowNumber = index + 2;
            const questionOrder = index + 1;
            const result = validateQuestionRow(row, rowNumber, questionOrder);
            if (result.errors.length > 0) errors.push(...result.errors);
            else questions.push(result.question);
          });
          resolve({ isValid: errors.length === 0, totalRows, errors, validQuestions: questions });
        })
        .on('error', reject);
    });
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

module.exports = { TEMPLATE_HEADERS, buildSampleRows, validateQuestionRow, parseAndValidateFile };
```

- [ ] **Step 2: Refactor `questionImportController.js` to use it**

Replace the `TEMPLATE_HEADERS` constant (lines 52-67) and the sample-data literal inside `downloadTemplate` (lines 80-113) with the imported helpers:

```js
const { TEMPLATE_HEADERS, buildSampleRows, parseAndValidateFile } = require('../../utils/questionImportParser');
```

In `downloadTemplate`, replace the inline `sampleData` array declaration with `const sampleData = buildSampleRows();` — the rest of the method (Excel/CSV writing) is unchanged.

Delete the now-duplicated `parseAndValidateFile` (lines 264-345) and `validateQuestionRow` (lines 348-469) method bodies from the class, and update the two call sites (`this.parseAndValidateFile(...)` in `validateImportFile` and `previewImport`/`executeImport`) to call the imported `parseAndValidateFile(...)` function directly instead of `this.parseAndValidateFile(...)`.

- [ ] **Step 3: Verify the extraction didn't change Admin's behavior**

```bash
node -e "
const { parseAndValidateFile, validateQuestionRow, buildSampleRows } = require('./utils/questionImportParser');
console.log('buildSampleRows length:', buildSampleRows().length);
const r = validateQuestionRow({ 'Question Text (English)': 'Q?', 'Option A (English)': 'a', 'Option B (English)': 'b', 'Option C (English)': 'c', 'Option D (English)': 'd', 'Correct Answer': 'A', Marks: 1 }, 2, 1);
console.log('errors (expect empty):', r.errors);
console.log('question.correct_answer (expect A):', r.question.correct_answer);
"
```
Expected: `buildSampleRows length: 2`, `errors (expect empty): []`, `question.correct_answer (expect A): A`.

- [ ] **Step 4: Smoke-test Admin's existing Import Questions flow in the browser**

Restart the backend, log into Admin Panel, open a question category, use **Import Questions → Download Excel Template**, fill 1 row, upload it, confirm the preview and import complete exactly as before.

- [ ] **Step 5: Commit**

```bash
git add utils/questionImportParser.js controllers/AdminController/questionImportController.js
git commit -m "refactor: extract question-import parsing into a shared util"
```

---

### Task 6: Educator import-template and parse-import endpoints

**Files:**
- Modify: `controllers/EducatorController/quizHierarchyController.js`
- Modify: `routes/EducatorRoutes/quizHierarchyRoutes.js`

**Interfaces:**
- Consumes: `TEMPLATE_HEADERS`, `buildSampleRows`, `parseAndValidateFile` from `utils/questionImportParser.js` (Task 5).
- Produces: `GET /educator/quizzes/questions/import-template?format=excel|csv` (file download); `POST /educator/quizzes/questions/parse-import` (multipart `file`) → `{ success, data: { totalRows, validQuestions, errors } }`, consumed by the frontend `QuizQuickBuilder` (Task 13), whose "confirm" step then calls the bulk-create endpoint from Task 4 with `validQuestions`.

- [ ] **Step 1: Add a scratch-file multer config and the two handlers**

At the top of `quizHierarchyController.js`, add:

```js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { TEMPLATE_HEADERS, buildSampleRows, parseAndValidateFile } = require('../../utils/questionImportParser');

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
```

Add the handlers:

```js
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
```

- [ ] **Step 2: Wire the routes**

In `routes/EducatorRoutes/quizHierarchyRoutes.js`, add near the top (before the `:categoryUuid` routes, so they aren't swallowed):

```js
router.get('/questions/import-template', quizHierarchyController.downloadImportTemplate);
router.post('/questions/parse-import', quizHierarchyController.parseImportUploadMiddleware, quizHierarchyController.parseImportFile);
```

- [ ] **Step 3: Verify template download**

```bash
curl -s -o /tmp_template.xlsx -w "%{http_code}\n" "http://localhost:3000/api/educator/quizzes/questions/import-template?format=excel" -H "Authorization: Bearer <TOKEN>"
node -e "const XLSX=require('xlsx'); const wb=XLSX.readFile('/tmp_template.xlsx'); console.log(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]).length, 'rows');"
```
Expected: `200`, then `2 rows`.

- [ ] **Step 4: Verify parse-import with a small generated file**

```bash
node -e "
const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet([
  { 'Question Text (English)': 'What is 5+5?', 'Option A (English)': '9', 'Option B (English)': '10', 'Option C (English)': '11', 'Option D (English)': '12', 'Correct Answer': 'B', 'Marks': 1 },
  { 'Question Text (English)': 'Bad row, missing options', 'Correct Answer': 'A' }
]);
XLSX.utils.book_append_sheet(wb, ws, 'Questions');
XLSX.writeFile(wb, '/tmp_import_test.xlsx');
"
curl -s -X POST http://localhost:3000/api/educator/quizzes/questions/parse-import \
  -H "Authorization: Bearer <TOKEN>" -F "file=@/tmp_import_test.xlsx"
```
Expected: `success: true`, `data.validQuestions` has 1 entry (`"What is 5+5?"`), `data.errors` has entries for row 3 (missing options).

- [ ] **Step 5: Verify nothing was written to the DB and the temp file was cleaned up**

```bash
node -e "const {Question}=require('./models'); Question.findOne({where:{question_text:'What is 5+5?'}}).then(q=>{console.log('should be null:', q); process.exit(0);});"
ls uploads/tmp_question_imports 2>/dev/null || echo "dir empty or missing — good"
```

- [ ] **Step 6: Commit**

```bash
git add controllers/EducatorController/quizHierarchyController.js routes/EducatorRoutes/quizHierarchyRoutes.js
git commit -m "feat: add educator quiz-question Excel/CSV import template and parser"
```

---

### Task 7: Course-scoped inline PDF upload

**Files:**
- Create: `utils/coursePdfUpload.js`
- Modify: `controllers/EducatorController/courseController.js`
- Modify: `routes/EducatorRoutes/courseRoutes.js`

**Interfaces:**
- Consumes: `Course.pdf_category_id` (Task 1); `validatePDFFile`, `PDF_UPLOAD_MAX_SIZE_BYTES`/`PDF_UPLOAD_MAX_SIZE_MB` from `utils/pdfUpload.js` / `utils/uploadConfig.js` (existing).
- Produces: `POST /educator/courses/:courseUuid/pdfs` (multipart: `title`, `description?`, `file`) → `{ success, data: { id, title } }` (matches `PdfOption` shape already used by `getAvailablePdfs`), consumed by the frontend `PdfQuickUpload` (Task 12).

- [ ] **Step 1: Add the multer config**

```js
// utils/coursePdfUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PDF_UPLOAD_MAX_SIZE_BYTES } = require('./uploadConfig');

const uploadDir = path.join(__dirname, '../uploads/pdfs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        cb(null, `pdf-${unique}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
        return cb(null, true);
    }
    cb(new Error('Only PDF files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: PDF_UPLOAD_MAX_SIZE_BYTES, files: 1 } });

module.exports = { coursePdfUploadMiddleware: upload.single('file') };
```

- [ ] **Step 2: Add the course-PDF-root helper and endpoint to `courseController.js`**

Add the require:

```js
const { validatePDFFile, PDF_UPLOAD_MAX_SIZE_MB } = require('../../utils/pdfUpload');
```

(`Pdfs` and `PdfCategory` must already be importable from `../../models` — add them to the destructured models import at the top of the file if not already present.)

Add the helper:

```js
async function findOrCreateCoursePdfRoot(course, educator) {
    if (course.pdf_category_id) {
        const existing = await PdfCategory.findByPk(course.pdf_category_id);
        if (existing) return existing;
    }

    const category = await PdfCategory.create({
        name: `${course.title} — Course PDFs`,
        description: `Auto-created folder for PDFs uploaded inline from the "${course.title}" course builder.`,
        node_type: 'unset',
        educator_id: educator.id
    });

    await course.update({ pdf_category_id: category.id });
    return category;
}
```

Add the handler:

```js
exports.uploadCoursePdf = async (req, res, next) => {
    try {
        const { courseUuid } = req.params;
        const { title, description } = req.body;

        if (!req.file) return next(new ErrorHandler('No PDF file provided', 400));
        if (req.file.mimetype !== 'application/pdf') {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return next(new ErrorHandler('Only PDF files are allowed', 400));
        }
        if (!validatePDFFile(req.file.path)) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return next(new ErrorHandler('Invalid PDF — file signature check failed', 400));
        }
        if (!title || !title.trim()) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return next(new ErrorHandler('Title is required', 400));
        }

        const course = await Course.findOne({ where: { uuid: courseUuid, educator_id: req.educator.id } });
        if (!course) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return next(new ErrorHandler('Course not found or not owned by you', 404));
        }

        const category = await findOrCreateCoursePdfRoot(course, req.educator);

        const pdf = await Pdfs.create({
            title: title.trim(),
            description: description?.trim() || null,
            category_id: category.id,
            file_path: req.file.path,
            original_filename: req.file.originalname,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            uploaded_by_educator_id: req.educator.id
        });

        if (category.node_type === 'unset') {
            await category.update({ node_type: 'pdf_holder' });
        }

        res.status(201).json({ success: true, data: { id: pdf.id, title: pdf.title } });
    } catch (err) {
        console.error('Upload course PDF error:', err);
        return next(new ErrorHandler('Failed to upload PDF', 500));
    }
};
```

(`fs` must already be required at the top of `courseController.js` — add `const fs = require('fs');` if missing.)

- [ ] **Step 3: Wire the route**

In `routes/EducatorRoutes/courseRoutes.js`, add:

```js
const { coursePdfUploadMiddleware } = require('../../utils/coursePdfUpload');
// ...
router.post('/:courseUuid/pdfs', coursePdfUploadMiddleware, courseController.uploadCoursePdf);
```

- [ ] **Step 4: Verify with a real upload**

```bash
curl -s -X POST http://localhost:3000/api/educator/courses/<COURSE_UUID>/pdfs \
  -H "Authorization: Bearer <TOKEN>" \
  -F "title=Chapter 1 Notes" -F "file=@Viewebit-backend/test-pdf.pdf;type=application/pdf"
```
Expected: `{"success":true,"data":{"id":"<uuid>","title":"Chapter 1 Notes"}}`.

- [ ] **Step 5: Verify the auto-folder was created and the PDF shows up in PDF Library**

```bash
node -e "
const { Course, PdfCategory, Pdfs } = require('./models');
Course.findOne({ where: { uuid: '<COURSE_UUID>' } }).then(async (c) => {
  const cat = await PdfCategory.findByPk(c.pdf_category_id);
  console.log('folder:', cat.name, cat.node_type);
  const pdf = await Pdfs.findOne({ where: { title: 'Chapter 1 Notes' } });
  console.log('pdf category_id matches folder:', pdf.category_id === cat.id);
  process.exit(0);
});
"
```
Then in the Educator Panel browser UI, open **PDF Library** and confirm a folder named `"<course title> — Course PDFs"` exists containing "Chapter 1 Notes".

- [ ] **Step 6: Commit**

```bash
git add utils/coursePdfUpload.js controllers/EducatorController/courseController.js routes/EducatorRoutes/courseRoutes.js
git commit -m "feat: add course-scoped inline PDF upload"
```

---

### Task 8: Course-scoped inline video/audio upload

**Files:**
- Modify: `utils/uploadConfig.js`
- Create: `utils/lessonMediaUpload.js`
- Modify: `controllers/EducatorController/courseController.js`
- Modify: `routes/EducatorRoutes/courseRoutes.js`

**Interfaces:**
- Produces: `POST /educator/courses/:courseUuid/lessons/media` (multipart: `file`, `kind: 'video'|'audio'`) → `{ success, data: { url } }`, consumed by the frontend media-upload toggle in `LessonContentModal` (Task 15). `url` is written directly into `Lesson.video_url` — no schema change.

- [ ] **Step 1: Add size-limit constants**

In `utils/uploadConfig.js`, after the `PDF_UPLOAD_MAX_SIZE_BYTES` block, add:

```js
const VIDEO_UPLOAD_MAX_SIZE_MB = parsePositiveInt(process.env.VIDEO_UPLOAD_MAX_SIZE_MB, 500);
const VIDEO_UPLOAD_MAX_SIZE_BYTES = VIDEO_UPLOAD_MAX_SIZE_MB * 1024 * 1024;

const AUDIO_UPLOAD_MAX_SIZE_MB = parsePositiveInt(process.env.AUDIO_UPLOAD_MAX_SIZE_MB, 100);
const AUDIO_UPLOAD_MAX_SIZE_BYTES = AUDIO_UPLOAD_MAX_SIZE_MB * 1024 * 1024;
```

Add all four to `module.exports`.

- [ ] **Step 2: Add the multer config**

```js
// utils/lessonMediaUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES } = require('./uploadConfig');

const uploadDir = path.join(__dirname, '../uploads/lesson_media');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        cb(null, `media-${unique}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) return cb(null, true);
    cb(new Error('Only video or audio files are allowed'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: Math.max(VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES), files: 1 }
});

module.exports = { lessonMediaUploadMiddleware: upload.single('file'), VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES };
```

(The per-kind cap is enforced in the controller, since multer's `fileSize` limit can't vary by a field value known only from the same multipart body.)

- [ ] **Step 3: Add the handler**

```js
const { lessonMediaUploadMiddleware, VIDEO_UPLOAD_MAX_SIZE_BYTES, AUDIO_UPLOAD_MAX_SIZE_BYTES } = require('../../utils/lessonMediaUpload');

exports.uploadLessonMedia = async (req, res, next) => {
    try {
        const { courseUuid } = req.params;
        const { kind } = req.body;

        if (!req.file) return next(new ErrorHandler('No file provided', 400));
        if (!['video', 'audio'].includes(kind)) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return next(new ErrorHandler('kind must be "video" or "audio"', 400));
        }
        const cap = kind === 'video' ? VIDEO_UPLOAD_MAX_SIZE_BYTES : AUDIO_UPLOAD_MAX_SIZE_BYTES;
        if (req.file.size > cap) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return next(new ErrorHandler(`File exceeds the ${kind} upload limit`, 400));
        }
        if (!req.file.mimetype.startsWith(`${kind}/`)) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return next(new ErrorHandler(`File does not match kind=${kind}`, 400));
        }

        const course = await Course.findOne({ where: { uuid: courseUuid, educator_id: req.educator.id } });
        if (!course) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return next(new ErrorHandler('Course not found or not owned by you', 404));
        }

        const relativePath = `/uploads/lesson_media/${req.file.filename}`;
        const url = `${req.protocol}://${req.get('host')}${relativePath}`;
        res.status(201).json({ success: true, data: { url } });
    } catch (err) {
        console.error('Upload lesson media error:', err);
        return next(new ErrorHandler('Failed to upload media', 500));
    }
};
```

(Reuses the `toFullUploadUrl` pattern already established for course thumbnails — confirm `/uploads` is already statically served by checking `app.use('/uploads', express.static(...))` in `index.js`; if `uploads/lesson_media` isn't automatically covered by an existing static mount, no route change is needed since `/uploads` is mounted at the parent `uploads/` directory.)

- [ ] **Step 4: Wire the route**

```js
const { lessonMediaUploadMiddleware } = require('../../utils/lessonMediaUpload');
// ...
router.post('/:courseUuid/lessons/media', lessonMediaUploadMiddleware, courseController.uploadLessonMedia);
```

- [ ] **Step 5: Verify with a real upload**

```bash
node -e "
const fs = require('fs');
fs.writeFileSync('/tmp_test.mp3', Buffer.from([0,0,0,0,0,0,0,0]));
"
curl -s -X POST http://localhost:3000/api/educator/courses/<COURSE_UUID>/lessons/media \
  -H "Authorization: Bearer <TOKEN>" \
  -F "kind=audio" -F "file=@/tmp_test.mp3;type=audio/mpeg"
```
Expected: `{"success":true,"data":{"url":"http://localhost:3000/uploads/lesson_media/media-....mp3"}}`. Fetch that URL directly and confirm it downloads the file.

- [ ] **Step 6: Verify kind/mimetype mismatch is rejected**

```bash
curl -s -X POST http://localhost:3000/api/educator/courses/<COURSE_UUID>/lessons/media \
  -H "Authorization: Bearer <TOKEN>" \
  -F "kind=video" -F "file=@/tmp_test.mp3;type=audio/mpeg"
```
Expected: `{"success":false,"message":"File does not match kind=video"}`.

- [ ] **Step 7: Commit**

```bash
git add utils/uploadConfig.js utils/lessonMediaUpload.js controllers/EducatorController/courseController.js routes/EducatorRoutes/courseRoutes.js
git commit -m "feat: add course-scoped inline video/audio upload"
```

---

### Task 9: Frontend services for the new endpoints

**Files:**
- Modify: `src/services/courses.ts`
- Modify: `src/services/quizHierarchy.ts`

**Interfaces:**
- Consumes: endpoints from Tasks 3, 4, 6, 7, 8.
- Produces: `coursesService.uploadCoursePdf`, `coursesService.createCourseQuizCategory`, `coursesService.uploadLessonMedia`, `quizHierarchyService.bulkCreateQuestions`, `quizHierarchyService.importTemplateUrl`, `quizHierarchyService.parseImportFile` — consumed by Tasks 12, 13, 14, 15.

- [ ] **Step 1: Add methods to `courses.ts`**

After `uploadThumbnail`, add:

```ts
  uploadCoursePdf: async (courseUuid: string, title: string, file: File, description?: string): Promise<{ success: boolean; data: { id: string; title: string } }> => {
    const formData = new FormData();
    formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('file', file);
    const response = await api.post(`/educator/courses/${courseUuid}/pdfs`, formData);
    return response.data;
  },

  createCourseQuizCategory: async (courseUuid: string, name: string): Promise<{ success: boolean; data: { id: number; uuid: string; name: string; node_type: string } }> => {
    const response = await api.post(`/educator/courses/${courseUuid}/quiz-categories`, { name });
    return response.data;
  },

  uploadLessonMedia: async (courseUuid: string, kind: 'video' | 'audio', file: File): Promise<{ success: boolean; data: { url: string } }> => {
    const formData = new FormData();
    formData.append('kind', kind);
    formData.append('file', file);
    const response = await api.post(`/educator/courses/${courseUuid}/lessons/media`, formData);
    return response.data;
  },
```

- [ ] **Step 2: Add methods to `quizHierarchy.ts`**

After `createQuestion`, add:

```ts
  bulkCreateQuestions: async (
    categoryUuid: string,
    questions: {
      question_text: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      correct_answer: 'A' | 'B' | 'C' | 'D';
      explanation?: string;
      marks?: number;
    }[]
  ): Promise<{ success: boolean; data: { created: number; questions: QuizQuestion[] } }> => {
    const response = await api.post(`/educator/quizzes/categories/${categoryUuid}/questions/bulk`, { questions });
    return response.data;
  },

  importTemplateUrl: (format: 'excel' | 'csv'): string => {
    const base = (api.defaults.baseURL || '').replace(/\/$/, '');
    return `${base}/educator/quizzes/questions/import-template?format=${format}`;
  },

  parseImportFile: async (file: File): Promise<{ success: boolean; data: { totalRows: number; validQuestions: any[]; errors: any[] } }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/educator/quizzes/questions/parse-import', formData);
    return response.data;
  },
```

- [ ] **Step 3: Typecheck**

```bash
cd "Viewebit-EducatorPanel" && npx tsc --noEmit -p tsconfig.app.json
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/courses.ts src/services/quizHierarchy.ts
git commit -m "feat: add frontend service methods for inline content creation endpoints"
```

---

### Task 10: Extract shared `QuestionFieldsForm`

**Files:**
- Create: `src/components/quizzes/QuestionFieldsForm.tsx`
- Modify: `src/pages/quizzes/QuizCategoriesPage.tsx`

**Interfaces:**
- Produces: `<QuestionFieldsForm value={{questionText, options, correctAnswer, explanation, marks}} onChange={...} idPrefix={string} />` — consumed by `QuizCategoriesPage.tsx` (this task) and `QuizQuickBuilder.tsx` (Task 13).

- [ ] **Step 1: Create the shared form component**

Extract the JSX body shared between `AddQuestionModal` (lines 150-201 of `QuizCategoriesPage.tsx`) and `EditQuestionModal` (lines 356-407) into:

```tsx
// src/components/quizzes/QuestionFieldsForm.tsx
import React from 'react';

export interface QuestionFieldsValue {
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  marks: string;
}

interface QuestionFieldsFormProps {
  value: QuestionFieldsValue;
  onChange: (value: QuestionFieldsValue) => void;
  idPrefix: string;
}

export const QuestionFieldsForm: React.FC<QuestionFieldsFormProps> = ({ value, onChange, idPrefix }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
        <textarea
          value={value.questionText}
          onChange={(e) => onChange({ ...value, questionText: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
      </div>

      {(['A', 'B', 'C', 'D'] as const).map((key) => (
        <div key={key} className="flex items-center gap-3">
          <input
            type="radio"
            name={`${idPrefix}_correct_answer`}
            checked={value.correctAnswer === key}
            onChange={() => onChange({ ...value, correctAnswer: key })}
            className="h-4 w-4 text-primary-600"
          />
          <input
            type="text"
            value={value.options[key]}
            onChange={(e) => onChange({ ...value, options: { ...value.options, [key]: e.target.value } })}
            placeholder={`Option ${key}`}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
      ))}
      <p className="text-xs text-gray-500">Select the radio button next to the correct option.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (optional)</label>
        <textarea
          value={value.explanation}
          onChange={(e) => onChange({ ...value, explanation: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Marks</label>
        <input
          type="number"
          value={value.marks}
          onChange={(e) => onChange({ ...value, marks: e.target.value })}
          className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  );
};

export const emptyQuestionFields = (): QuestionFieldsValue => ({
  questionText: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A', explanation: '', marks: '1'
});
```

- [ ] **Step 2: Use it in `AddQuestionModal`**

In `QuizCategoriesPage.tsx`, replace the individual `questionText`/`options`/`correctAnswer`/`explanation`/`marks` state in `AddQuestionModal` with one `QuestionFieldsValue` state:

```tsx
import { QuestionFieldsForm, QuestionFieldsValue, emptyQuestionFields } from '../../components/quizzes/QuestionFieldsForm';
// ...
const [fields, setFields] = useState<QuestionFieldsValue>(emptyQuestionFields());

useEffect(() => {
  if (isOpen) setFields(emptyQuestionFields());
}, [isOpen]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!fields.questionText.trim() || !fields.options.A.trim() || !fields.options.B.trim() || !fields.options.C.trim() || !fields.options.D.trim()) {
    toast.error('Question text and all four options are required');
    return;
  }
  setLoading(true);
  try {
    await quizHierarchyService.createQuestion(categoryUuid, {
      question_text: fields.questionText,
      option_a: fields.options.A,
      option_b: fields.options.B,
      option_c: fields.options.C,
      option_d: fields.options.D,
      correct_answer: fields.correctAnswer,
      explanation: fields.explanation || undefined,
      marks: parseInt(fields.marks) || 1,
    });
    toast.success('Question added');
    onSuccess();
    onClose();
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to add question');
  } finally {
    setLoading(false);
  }
};
```

Replace the form body (the `<textarea>`/radio/`<input>` block) with:

```tsx
<QuestionFieldsForm value={fields} onChange={setFields} idPrefix="add" />
```

- [ ] **Step 3: Use it in `EditQuestionModal`** — same pattern: replace its 5 pieces of state with one `QuestionFieldsValue`, populate it from `question` in the existing `useEffect`, replace the form body with `<QuestionFieldsForm value={fields} onChange={setFields} idPrefix="edit" />`, and build the `updateQuestion` payload from `fields` the same way as Step 2.

- [ ] **Step 4: Typecheck**

```bash
cd "Viewebit-EducatorPanel" && npx tsc --noEmit -p tsconfig.app.json
```
Expected: no errors.

- [ ] **Step 5: Smoke-test in the browser**

Open **Quiz Categories**, add a question via **Add Question**, confirm it saves and displays correctly; edit it via **Edit**, confirm the fields pre-fill and save correctly. Behavior must be identical to before the refactor.

- [ ] **Step 6: Commit**

```bash
git add src/components/quizzes/QuestionFieldsForm.tsx src/pages/quizzes/QuizCategoriesPage.tsx
git commit -m "refactor: extract shared QuestionFieldsForm from Quiz Categories page"
```

---

### Task 11: `PdfQuickUpload` component

**Files:**
- Create: `src/components/courses/PdfQuickUpload.tsx`

**Interfaces:**
- Consumes: `coursesService.uploadCoursePdf` (Task 9).
- Produces: `<PdfQuickUpload courseUuid={string} onUploaded={(pdf: {id: string; title: string}) => void} />` — consumed by `LessonContentModal.tsx` (Task 14).

- [ ] **Step 1: Write the component**

```tsx
// src/components/courses/PdfQuickUpload.tsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { coursesService } from '../../services/courses';

interface PdfQuickUploadProps {
  courseUuid: string;
  onUploaded: (pdf: { id: string; title: string }) => void;
}

export const PdfQuickUpload: React.FC<PdfQuickUploadProps> = ({ courseUuid, onUploaded }) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!title.trim() || !file) {
      toast.error('Title and a PDF file are required');
      return;
    }
    setUploading(true);
    try {
      const res = await coursesService.uploadCoursePdf(courseUuid, title, file);
      toast.success('PDF uploaded');
      onUploaded(res.data);
      setTitle('');
      setFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-md p-3 space-y-3 bg-gray-50">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">PDF File *</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-sm text-gray-700"
        />
      </div>
      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading}
        className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload PDF'}
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

```bash
cd "Viewebit-EducatorPanel" && npx tsc --noEmit -p tsconfig.app.json
```
Expected: no errors (component isn't imported anywhere yet, so this only checks its own syntax/types).

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/PdfQuickUpload.tsx
git commit -m "feat: add PdfQuickUpload component for inline PDF uploads"
```

---

### Task 12: `QuizQuickBuilder` component

**Files:**
- Create: `src/components/courses/QuizQuickBuilder.tsx`

**Interfaces:**
- Consumes: `coursesService.createCourseQuizCategory`, `quizHierarchyService.bulkCreateQuestions`, `quizHierarchyService.importTemplateUrl`, `quizHierarchyService.parseImportFile` (Task 9); `QuestionFieldsForm`, `emptyQuestionFields` (Task 10).
- Produces: `<QuizQuickBuilder courseUuid={string} onCreated={(category: {id: number; uuid: string; name: string}) => void} />` — consumed by `LessonContentModal.tsx` (Task 14) for both the Quiz section and the quiz-type Assignment sub-flow.

- [ ] **Step 1: Write the component**

```tsx
// src/components/courses/QuizQuickBuilder.tsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { coursesService } from '../../services/courses';
import { quizHierarchyService } from '../../services/quizHierarchy';
import { QuestionFieldsForm, QuestionFieldsValue, emptyQuestionFields } from '../quizzes/QuestionFieldsForm';

interface QuizQuickBuilderProps {
  courseUuid: string;
  onCreated: (category: { id: number; uuid: string; name: string }) => void;
}

type ImportPreview = { totalRows: number; validQuestions: any[]; errors: any[] } | null;

export const QuizQuickBuilder: React.FC<QuizQuickBuilderProps> = ({ courseUuid, onCreated }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<{ id: number; uuid: string; name: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const [mode, setMode] = useState<'manual' | 'import'>('manual');
  const [fields, setFields] = useState<QuestionFieldsValue>(emptyQuestionFields());
  const [addedCount, setAddedCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview>(null);
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleCreateCategory = async () => {
    if (!name.trim()) {
      toast.error('Quiz name is required');
      return;
    }
    setCreating(true);
    try {
      const res = await coursesService.createCourseQuizCategory(courseUuid, name);
      setCategory(res.data);
      onCreated(res.data);
      toast.success('Quiz created — now add questions below');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create quiz');
    } finally {
      setCreating(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!category) return;
    if (!fields.questionText.trim() || !fields.options.A.trim() || !fields.options.B.trim() || !fields.options.C.trim() || !fields.options.D.trim()) {
      toast.error('Question text and all four options are required');
      return;
    }
    setSaving(true);
    try {
      await quizHierarchyService.bulkCreateQuestions(category.uuid, [{
        question_text: fields.questionText,
        option_a: fields.options.A,
        option_b: fields.options.B,
        option_c: fields.options.C,
        option_d: fields.options.D,
        correct_answer: fields.correctAnswer,
        explanation: fields.explanation || undefined,
        marks: parseInt(fields.marks) || 1,
      }]);
      setAddedCount((n) => n + 1);
      setFields(emptyQuestionFields());
      toast.success('Question added');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  const handleParseImport = async () => {
    if (!importFile) {
      toast.error('Choose a file first');
      return;
    }
    setParsing(true);
    try {
      const res = await quizHierarchyService.parseImportFile(importFile);
      setImportPreview(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!category || !importPreview || importPreview.validQuestions.length === 0) return;
    setConfirming(true);
    try {
      const res = await quizHierarchyService.bulkCreateQuestions(category.uuid, importPreview.validQuestions);
      setAddedCount((n) => n + res.data.created);
      toast.success(`${res.data.created} questions imported`);
      setImportPreview(null);
      setImportFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import questions');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-md p-3 space-y-3 bg-gray-50">
      {!category ? (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Quiz Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chapter 1 Quiz"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateCategory}
            disabled={creating}
            className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Quiz'}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-900">{category.name} — {addedCount} question{addedCount === 1 ? '' : 's'} added</p>

          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setMode('manual')} className={`px-2 py-1 rounded ${mode === 'manual' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
              Add manually
            </button>
            <button type="button" onClick={() => setMode('import')} className={`px-2 py-1 rounded ${mode === 'import' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
              Import from Excel/CSV
            </button>
          </div>

          {mode === 'manual' && (
            <div className="space-y-3">
              <QuestionFieldsForm value={fields} onChange={setFields} idPrefix="quick_quiz" />
              <button
                type="button"
                onClick={handleAddQuestion}
                disabled={saving}
                className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Adding...' : '+ Add another question'}
              </button>
            </div>
          )}

          {mode === 'import' && (
            <div className="space-y-3">
              <div className="flex gap-3 text-xs">
                <a href={quizHierarchyService.importTemplateUrl('excel')} className="text-primary-600 hover:underline">Download Excel Template</a>
                <a href={quizHierarchyService.importTemplateUrl('csv')} className="text-primary-600 hover:underline">Download CSV Template</a>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportPreview(null); }}
                className="w-full text-sm text-gray-700"
              />
              <button
                type="button"
                onClick={handleParseImport}
                disabled={!importFile || parsing}
                className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {parsing ? 'Validating...' : 'Upload & Validate'}
              </button>

              {importPreview && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-700">
                    {importPreview.validQuestions.length} valid, {importPreview.errors.length} error{importPreview.errors.length === 1 ? '' : 's'} out of {importPreview.totalRows} rows.
                  </p>
                  {importPreview.errors.length > 0 && (
                    <div className="max-h-24 overflow-y-auto text-xs text-red-600 space-y-0.5">
                      {importPreview.errors.slice(0, 10).map((e: any, i: number) => (
                        <p key={i}>Row {e.row}: {e.field} — {e.error}</p>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={importPreview.validQuestions.length === 0 || confirming}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {confirming ? 'Importing...' : `Confirm Import (${importPreview.validQuestions.length})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

```bash
cd "Viewebit-EducatorPanel" && npx tsc --noEmit -p tsconfig.app.json
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/QuizQuickBuilder.tsx
git commit -m "feat: add QuizQuickBuilder component with manual and Excel/CSV import question adding"
```

---

### Task 13: Wire PDF, Quiz, Assignment "Create New" toggles into `LessonContentModal`

**Files:**
- Modify: `src/components/courses/LessonContentModal.tsx`

**Interfaces:**
- Consumes: `PdfQuickUpload` (Task 11), `QuizQuickBuilder` (Task 12), `assignmentsService.createAssignment` (existing), `coursesService.getAvailablePdfs`/`getAvailableQuizCategories` (existing).

- [ ] **Step 1: Add mode state per content type**

Near the top of `LessonContentForm`, alongside the other `useState` calls, add:

```tsx
  const [pdfMode, setPdfMode] = useState<'existing' | 'new'>('existing');
  const [quizMode, setQuizMode] = useState<'existing' | 'new'>('existing');
  const [assignmentMode, setAssignmentMode] = useState<'existing' | 'new'>('existing');

  const [newAssignmentSubmissionType, setNewAssignmentSubmissionType] = useState<'text' | 'file_upload' | 'quiz'>('text');
  const [newAssignmentMaxPoints, setNewAssignmentMaxPoints] = useState('100');
  const [newAssignmentDueDate, setNewAssignmentDueDate] = useState('');
  const [creatingAssignment, setCreatingAssignment] = useState(false);
```

Import at the top:

```tsx
import { PdfQuickUpload } from './PdfQuickUpload';
import { QuizQuickBuilder } from './QuizQuickBuilder';
import { assignmentsService } from '../../services/assignments';
```

- [ ] **Step 2: Replace the PDF section (existing lines ~253-271) with a toggle**

```tsx
{lessonType === 'pdf' && (
  <div className="space-y-3">
    <div className="flex gap-2 text-xs">
      <button type="button" onClick={() => setPdfMode('existing')} className={`px-2 py-1 rounded ${pdfMode === 'existing' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
        Use Existing
      </button>
      <button type="button" onClick={() => setPdfMode('new')} className={`px-2 py-1 rounded ${pdfMode === 'new' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
        Upload New
      </button>
    </div>

    {pdfMode === 'existing' && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">PDF *</label>
        <select
          value={pdfId}
          onChange={(e) => setPdfId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={optionsLoading}
        >
          <option value="">{optionsLoading ? 'Loading...' : 'Select a PDF'}</option>
          {pdfs.map((pdf) => (
            <option key={pdf.id} value={pdf.id}>{pdf.title}</option>
          ))}
        </select>
      </div>
    )}

    {pdfMode === 'new' && (
      <PdfQuickUpload
        courseUuid={String(courseId)}
        onUploaded={(pdf) => {
          setPdfs((prev) => [pdf, ...prev]);
          setPdfId(pdf.id);
          setPdfMode('existing');
        }}
      />
    )}
  </div>
)}
```

Note: `PdfQuickUpload` needs the course's `uuid`, but `LessonContentModalProps.courseId` is the numeric `Course.id` (used by the existing `getAvailableAssignments(courseId)` call). Change `PdfQuickUpload`'s prop to accept `courseUuid` and pass it from a new prop threaded through `LessonContentModalProps`/`LessonContentModal`/`CourseBuilderPage` (see Step 5) rather than trying to derive uuid from the numeric id.

- [ ] **Step 3: Replace the Quiz section (existing lines ~273-291) with a toggle**

```tsx
{lessonType === 'quiz' && (
  <div className="space-y-3">
    <div className="flex gap-2 text-xs">
      <button type="button" onClick={() => setQuizMode('existing')} className={`px-2 py-1 rounded ${quizMode === 'existing' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
        Use Existing
      </button>
      <button type="button" onClick={() => setQuizMode('new')} className={`px-2 py-1 rounded ${quizMode === 'new' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
        Create New
      </button>
    </div>

    {quizMode === 'existing' && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Category *</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={optionsLoading}
        >
          <option value="">{optionsLoading ? 'Loading...' : 'Select a quiz category'}</option>
          {quizCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
    )}

    {quizMode === 'new' && (
      <QuizQuickBuilder
        courseUuid={courseUuid}
        onCreated={(cat) => setCategoryId(String(cat.id))}
      />
    )}
  </div>
)}
```

- [ ] **Step 4: Replace the Assignment section (existing lines ~293-311) with a toggle**

```tsx
{lessonType === 'assignment' && (
  <div className="space-y-3">
    <div className="flex gap-2 text-xs">
      <button type="button" onClick={() => setAssignmentMode('existing')} className={`px-2 py-1 rounded ${assignmentMode === 'existing' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
        Use Existing
      </button>
      <button type="button" onClick={() => setAssignmentMode('new')} className={`px-2 py-1 rounded ${assignmentMode === 'new' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
        Create New
      </button>
    </div>

    {assignmentMode === 'existing' && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Assignment *</label>
        <select
          value={assignmentId}
          onChange={(e) => setAssignmentId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={optionsLoading}
        >
          <option value="">{optionsLoading ? 'Loading...' : 'Select an assignment'}</option>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      </div>
    )}

    {assignmentMode === 'new' && (
      <div className="border border-gray-200 rounded-md p-3 space-y-3 bg-gray-50">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Submission Type *</label>
          <select
            value={newAssignmentSubmissionType}
            onChange={(e) => setNewAssignmentSubmissionType(e.target.value as any)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="text">Text answer</option>
            <option value="file_upload">File upload</option>
            <option value="quiz">Quiz</option>
          </select>
        </div>

        {newAssignmentSubmissionType === 'quiz' && (
          <QuizQuickBuilder courseUuid={courseUuid} onCreated={(cat) => setCategoryId(String(cat.id))} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max Points</label>
            <input
              type="number"
              value={newAssignmentMaxPoints}
              onChange={(e) => setNewAssignmentMaxPoints(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="datetime-local"
              value={newAssignmentDueDate}
              onChange={(e) => setNewAssignmentDueDate(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={creatingAssignment || !title.trim() || (newAssignmentSubmissionType === 'quiz' && !categoryId)}
          onClick={async () => {
            setCreatingAssignment(true);
            try {
              const res = await assignmentsService.createAssignment(courseUuid, {
                title,
                submission_type: newAssignmentSubmissionType,
                category_id: newAssignmentSubmissionType === 'quiz' ? parseInt(categoryId) : undefined,
                max_points: parseInt(newAssignmentMaxPoints) || 100,
                due_date: newAssignmentDueDate || undefined,
              });
              setAssignments((prev) => [res.data, ...prev]);
              setAssignmentId(String(res.data.id));
              setAssignmentMode('existing');
              toast.success('Assignment created');
            } catch (error: any) {
              toast.error(error.response?.data?.message || 'Failed to create assignment');
            } finally {
              setCreatingAssignment(false);
            }
          }}
          className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {creatingAssignment ? 'Creating...' : 'Create Assignment'}
        </button>
        {!title.trim() && <p className="text-xs text-gray-500">Set the lesson Title above first — the assignment reuses it.</p>}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Thread `courseUuid` through `LessonContentModal`'s props**

`LessonContentModalProps` currently only has `courseId: number`. Add `courseUuid: string`:

```tsx
interface LessonContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courseId: number;
  courseUuid: string;
  moduleUuid?: string;
  lesson?: Lesson | null;
  initialSelection?: ContentTypeSelection | null;
}
```

Pass it through to `LessonContentForm` in the outer `LessonContentModal` component the same way `courseId` is passed, and update `PdfQuickUpload`'s call in Step 2 to use `courseUuid` instead of `String(courseId)`. In `CourseBuilderPage.tsx`, find both `<LessonContentModal ... courseId={course.id} .../>` call sites (create and edit instances) and add `courseUuid={course.uuid}` next to `courseId={course.id}`.

- [ ] **Step 6: Typecheck**

```bash
cd "Viewebit-EducatorPanel" && npx tsc --noEmit -p tsconfig.app.json
```
Expected: no errors. Fix any missed prop-threading or import issues surfaced here before moving on.

- [ ] **Step 7: Commit**

```bash
git add src/components/courses/LessonContentModal.tsx src/pages/courses/CourseBuilderPage.tsx
git commit -m "feat: wire inline Create-New flows for PDF, Quiz, and Assignment content"
```

---

### Task 14: Wire Video/Audio upload toggle into `LessonContentModal`

**Files:**
- Modify: `src/components/courses/LessonContentModal.tsx`

**Interfaces:**
- Consumes: `coursesService.uploadLessonMedia` (Task 9).

- [ ] **Step 1: Add upload state**

```tsx
  const [mediaMode, setMediaMode] = useState<'url' | 'upload'>('url');
  const [uploadingMedia, setUploadingMedia] = useState(false);
```

- [ ] **Step 2: Replace the Video/Audio section (existing lines ~229-251) with a toggle**

```tsx
{(lessonType === 'video' || lessonType === 'audio') && (
  <div className="space-y-3">
    <div className="flex gap-2 text-xs">
      <button type="button" onClick={() => setMediaMode('url')} className={`px-2 py-1 rounded ${mediaMode === 'url' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
        Paste URL
      </button>
      <button type="button" onClick={() => setMediaMode('upload')} className={`px-2 py-1 rounded ${mediaMode === 'upload' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
        Upload File
      </button>
    </div>

    {mediaMode === 'url' && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{lessonType === 'video' ? 'Video URL *' : 'Audio URL *'}</label>
        <input
          type="text"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    )}

    {mediaMode === 'upload' && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{lessonType === 'video' ? 'Video File *' : 'Audio File *'}</label>
        <input
          type="file"
          accept={lessonType === 'video' ? 'video/*' : 'audio/*'}
          disabled={uploadingMedia}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploadingMedia(true);
            try {
              const res = await coursesService.uploadLessonMedia(courseUuid, lessonType as 'video' | 'audio', file);
              setMediaUrl(res.data.url);
              toast.success('File uploaded');
            } catch (error: any) {
              toast.error(error.response?.data?.message || 'Failed to upload file');
            } finally {
              setUploadingMedia(false);
            }
          }}
          className="w-full text-sm text-gray-700"
        />
        {uploadingMedia && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
        {mediaUrl && !uploadingMedia && <p className="text-xs text-green-600 mt-1">Uploaded — you can replace it by choosing another file.</p>}
      </div>
    )}

    {youtubeEmbed && (
      <div className="mt-3 aspect-video rounded-md overflow-hidden border border-gray-200">
        <iframe src={youtubeEmbed} className="w-full h-full" allowFullScreen title="Video preview" />
      </div>
    )}
    {!youtubeEmbed && lessonType === 'video' && mediaUrl && (
      <video src={mediaUrl} controls className="mt-3 w-full rounded-md border border-gray-200 max-h-64" />
    )}
    {lessonType === 'audio' && mediaUrl && (
      <audio src={mediaUrl} controls className="mt-3 w-full" />
    )}
  </div>
)}
```

- [ ] **Step 3: Typecheck**

```bash
cd "Viewebit-EducatorPanel" && npx tsc --noEmit -p tsconfig.app.json
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/courses/LessonContentModal.tsx
git commit -m "feat: add inline video/audio upload alongside paste-URL option"
```

---

### Task 15: Full browser E2E verification and cleanup

**Files:** none (verification only).

- [ ] **Step 1: Restart all four local dev servers** (backend, AdminPanel, EducatorPanel, web) if not already running.

Use these exact literal names throughout Steps 2-6 so cleanup in Step 8 can target them precisely:
- Lesson titles: `"Inline Test PDF Lesson"`, `"Inline Test Manual Quiz Lesson"`, `"Inline Test Import Quiz Lesson"`, `"Inline Test Assignment Lesson"`, `"Inline Test Video Lesson"`
- PDF title: `"Inline Test PDF"`
- Quiz names: `"Inline Test Manual Quiz"`, `"Inline Test Import Quiz"`
- Assignment title: `"Inline Test Assignment Lesson"` (assignment inline-create reuses the lesson title, per Task 13 Step 4)

- [ ] **Step 2: PDF flow** — log into Educator Panel (real OTP flow), open an existing course's builder, Add Content → title `"Inline Test PDF Lesson"` → PDF → Upload New → title `"Inline Test PDF"`, choose a small PDF, upload. Verify: the popup auto-selects the new PDF and the lesson saves. Then via `node -e` against the models, confirm the `Pdfs` row and its `PdfCategory` (named after the course) exist with `uploaded_by_educator_id` set.

- [ ] **Step 3: Quiz — manual — flow** — Add Content → title `"Inline Test Manual Quiz Lesson"` → Quiz → Create New → name `"Inline Test Manual Quiz"` → Add manually → fill 2 questions one at a time. Verify: `addedCount` in the UI reaches 2, the lesson saves with the new `category_id`. Confirm via `node -e` that the `Category` (question_holder) and 2 `Question` rows exist.

- [ ] **Step 4: Quiz — Excel import — flow** — Add Content → title `"Inline Test Import Quiz Lesson"` → Quiz → Create New → name `"Inline Test Import Quiz"` → Import from Excel/CSV → download the template, save it with 3 filled rows (reuse the generation approach from Task 6 Step 4), upload, confirm the preview shows 3 valid/0 errors, click Confirm Import. Verify 3 `Question` rows were created under the new category.

- [ ] **Step 5: Assignment flow** — Add Content → title `"Inline Test Assignment Lesson"` → Assignment → Create New → submission type "Text answer" → Create Assignment. Verify: the popup auto-selects the new assignment and the lesson saves. Confirm via `node -e` that the `Assignment` row's `course_id` matches the course being edited.

- [ ] **Step 6: Video upload flow** — Add Content → title `"Inline Test Video Lesson"` → Video → Upload File → choose a small video file. Verify: the URL field populates, the `<video>` preview renders and plays, and the lesson saves with `video_url` pointing at the uploaded file. Fetch the URL directly to confirm it serves the file.

- [ ] **Step 7: Regression check** — confirm "Use Existing" still works for PDF, Quiz, and Assignment (pick something created in Steps 2-5), and that "Paste URL" still works for Video/Audio — these paths must be unchanged from before this plan.

- [ ] **Step 8: Clean up all test data created during Steps 2-6**

```bash
node -e "
const { Op } = require('sequelize');
const { Lesson, Pdfs, Question, Category, Assignment } = require('./models');
(async () => {
  const lessonTitles = [
    'Inline Test PDF Lesson', 'Inline Test Manual Quiz Lesson', 'Inline Test Import Quiz Lesson',
    'Inline Test Assignment Lesson', 'Inline Test Video Lesson'
  ];
  const quizNames = ['Inline Test Manual Quiz', 'Inline Test Import Quiz'];

  await Lesson.destroy({ where: { title: { [Op.in]: lessonTitles } } });

  const quizCategories = await Category.findAll({ where: { name: { [Op.in]: quizNames } } });
  const quizCategoryIds = quizCategories.map((c) => c.id);
  if (quizCategoryIds.length) {
    await Question.destroy({ where: { category_id: { [Op.in]: quizCategoryIds } } });
    await Category.destroy({ where: { id: { [Op.in]: quizCategoryIds } } });
  }

  await Pdfs.destroy({ where: { title: 'Inline Test PDF' } });
  await Assignment.destroy({ where: { title: 'Inline Test Assignment Lesson' } });

  console.log('cleanup done');
  process.exit(0);
})();
"
```

This intentionally leaves the course's own `pdf_category_id`/`quiz_category_id` auto-root folders in place (e.g. `"<course title> — Course PDFs"`, `"<course title> — Course Quizzes"`) since they belong to a real, kept course — only their now-empty test children were removed above. Delete the auto-roots too only if the whole test course itself is also being torn down.

- [ ] **Step 9: Report results** — summarize what was verified and any deviations found, following the same format used for prior feature verifications in this project.

---

## Self-Review Notes

- **Spec coverage:** PDF (Task 7/11/13), Quiz manual+import (Task 3/4/5/6/10/12/13), Assignment (Task 13, reusing existing endpoint), Video/Audio (Task 8/14), auto-provisioned containers (Task 1/3/7), shared parser extraction (Task 5/6), shared question form extraction (Task 10) — every spec section has a task.
- **Type consistency checked:** `PdfQuickUpload.onUploaded` payload shape (`{id, title}`) matches `uploadCoursePdf`'s response and `PdfOption`; `QuizQuickBuilder.onCreated` payload (`{id, uuid, name}`) matches `createCourseQuizCategory`'s response and is used consistently in both Quiz and Assignment call sites in Task 13; `bulkCreateQuestions` question shape matches both the manual single-question path and the `parseImportFile` → `validQuestions` path (both ultimately produce `question_text/option_a-d/correct_answer/explanation/marks`).
- **Known follow-up wired explicitly:** Task 13 Step 5 calls out that `courseUuid` must be threaded as a new prop through `LessonContentModal` and its two call sites in `CourseBuilderPage.tsx` — flagged rather than left implicit, since it's easy to miss.
