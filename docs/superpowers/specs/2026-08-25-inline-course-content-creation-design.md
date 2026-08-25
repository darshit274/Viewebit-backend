# Inline Course Content Creation

Date: 2026-08-25
Repos touched: `Viewebit-backend`, `Viewebit-EducatorPanel`
Branch: `new-features` (both repos)

## Problem

The Course Builder's "Add Content" popup (`LessonContentModal.tsx`) already lets an
educator write Text lessons directly, and already lets them schedule a new Live
Session inline. But PDF, Quiz, and Assignment content only offer a dropdown of
*already-existing* material — the PDF, the quiz category, or the assignment has to be
created first on a separate page (PDF Library, Quiz Categories, Assignments &
Quizzes) before it can be attached to a lesson. Video/Audio lessons only accept a
pasted URL; there's no way to upload a file.

Goal: every content type can be fully created without leaving the course builder,
while the existing standalone libraries keep working for material an educator wants
to reuse across lessons/courses.

## Approach

Add a **Create New / Use Existing** toggle to the PDF, Quiz, and Assignment sections
of `LessonContentModal`, and an **Upload File / Paste URL** toggle to Video and
Audio. "Use Existing" and "Paste URL" are exactly what exists today — unchanged.
"Create New" / "Upload File" are new.

### Auto-provisioned containers

PDFs and Quiz questions both require a parent folder/category node before they can
be created (`PdfCategory` with `node_type: pdf_holder`, `Category` with
`node_type: question_holder` or a container above it). Forcing the educator to pick
or create that folder inside the lesson popup would reintroduce the friction we're
removing.

This codebase already has a precedent for exactly this problem:
`quizHierarchyController.getOrCreateQuizBank()` lazily creates a private `TestSeries`
the first time an educator makes a quiz category, and caches its id on
`Educator.quiz_bank_test_series_id`. We reuse the same pattern one level down, scoped
per-course instead of per-educator:

- `courses.pdf_category_id` (nullable FK → `pdf_categories.id`)
- `courses.quiz_category_id` (nullable FK → `categories.id`)

The first inline PDF upload for a course creates a `PdfCategory` named after the
course (e.g. `"Organic Chemistry — Course PDFs"`, `node_type: unset`) and stores its
id on `courses.pdf_category_id`; every later inline upload for that course reuses it
directly (the category's `node_type` flips to `pdf_holder` on first upload, same as
today's manual flow). Same mechanism for quiz: `courses.quiz_category_id` points at a
root `Category` (`node_type: container`) that inline-created quizzes are added under
as named sub-categories (one sub-category per quiz, `node_type: question_holder`
once it has questions).

The educator never sees a folder picker. The material is still fully visible and
manageable afterward in PDF Library / Quiz Categories, under a folder named for the
course.

### PDF

New endpoint, multipart upload, mirrors `pdfHierarchyController.uploadPdf` validation
(`validatePDFFile`, `PDF_UPLOAD_MAX_SIZE_BYTES`, mimetype check) but resolves its
category automatically instead of taking `categoryUuid` from the URL:

```
POST /educator/courses/:courseUuid/pdfs   (multipart: title, description?, file)
  -> find-or-create course.pdf_category_id
  -> create Pdfs row under it, uploaded_by_educator_id = req.educator.id
  -> 201 { success, data: { id, title } }   // shape matches PdfOption
```

Frontend: PDF section gets a small inline upload form (title + file input, same
fields as `PdfLibraryPage`'s `UploadModal`) behind the "Create New" tab. On success,
the returned PDF is appended to the in-memory `pdfs` list and auto-selected, exactly
like the existing "schedule new session" flow does for live sessions.

No schema change to `Pdfs`.

### Quiz

The bigger piece. Educator quiz categories already reuse the **same** `Category` /
`Question` tables as Admin's test bank (`quizHierarchyController.js` scopes every
query by `educator_id`), which means the Excel/CSV importer Admin already has
(`questionImportController.js`) is directly reusable — same template, same
validation rules, same target table.

**1. Create the quiz category:**
```
POST /educator/courses/:courseUuid/quiz-categories   { name }
  -> find-or-create course.quiz_category_id (root container, node_type: container)
  -> create a Category under it: { name, educator_id, node_type: 'unset' }
  -> 201 { success, data: { id, uuid, name } }
```
Immediate, like today's "New Category" button — not deferred to lesson save.

**2. Add questions — manual, one call for the whole batch:**
```
POST /educator/quiz-hierarchy/categories/:uuid/questions/bulk
  { questions: [{ question_text, option_a..d, correct_answer, explanation?, marks? }, ...] }
  -> ownership check via findOwnedCategory (existing helper)
  -> bulk-create Questions, category.node_type -> question_holder if it was 'unset'
  -> 201 { success, data: { created: number, questions: [...] } }
```
New endpoint, but the row-level validation and creation logic is the same as the
existing single-question `createQuestion` — just looped inside one transaction so a
partial failure doesn't leave the category half-populated.

**3. Add questions — Excel/CSV import**, matching Admin's UX (download template →
upload → preview with validation errors → confirm), but synchronous — no
`QuestionImport` tracking row, no background job/polling, because these files are
small (a few hundred rows at most) and educators don't need import history:

```
GET  /educator/quiz-hierarchy/questions/import-template?format=excel|csv
POST /educator/quiz-hierarchy/questions/parse-import   (multipart file)
  -> parses + validates only, no DB writes, returns
     { success, data: { totalRows, validQuestions: [...], errors: [...] } }
```
The frontend shows the same preview panel Admin has (counts, first N errors, first N
valid questions), then on confirm calls the **same bulk endpoint from step 2**
(`POST .../categories/:uuid/questions/bulk`) with `validQuestions` — no separate
"confirm import" endpoint needed.

The parsing/validation logic (`parseAndValidateFile`, `validateQuestionRow`,
`TEMPLATE_HEADERS`, the bilingual-fields handling) moves out of
`questionImportController.js` into a new shared `utils/questionImportParser.js`.
Admin's controller is refactored to call the extracted functions — no behavior
change there. The educator endpoints import the same module.

**Frontend:** a new shared `QuestionFieldsForm` component (question text, 4 options,
correct-answer radio, marks, explanation) is extracted from
`QuizCategoriesPage.tsx`'s `AddQuestionModal`/`EditQuestionModal` and reused by both
those existing modals and the new inline quiz builder — avoids a third copy of a
non-trivial form. A new `QuizQuickBuilder` component (used inside
`LessonContentModal`'s "Create New" tab for Quiz, and inside the Assignment tab when
submission type is "quiz") holds: name field → create category button → tabs for
"Add manually" (repeatable `QuestionFieldsForm` + running list, "add another") and
"Import from Excel/CSV" (template download links, file picker, preview, confirm).
Once at least one question exists, the category is usable and gets auto-selected.

No schema change to `Category` or `Question`.

### Assignment

Simplest change — `assignmentsService.createAssignment` already requires a
`courseUuid` and has no folder concept, so the existing create form
(`AssignmentsPage.tsx`'s `CreateAssignmentModal`, minus its course picker since the
course is already known) is reused verbatim inside `LessonContentModal`'s "Create
New" tab for Assignment. If submission type is "quiz", it embeds the same
`QuizQuickBuilder` described above instead of a bare quiz-category dropdown.

No backend changes.

### Video / Audio

New endpoint, mirrors the thumbnail-upload multer pattern already in
`courseController.js` (disk storage, relative path in DB / full URL in response):

```
POST /educator/courses/:courseUuid/lessons/media   (multipart: file, kind: 'video'|'audio')
  -> validate mimetype (video/* or audio/*) and size (video: 500MB cap, audio: 100MB cap)
  -> store under uploads/lesson_media/
  -> 201 { success, data: { url } }
```
The returned URL is written straight into the existing `mediaUrl` state in
`LessonContentModal`, which already flows into `Lesson.video_url` on save — no
`Lesson` schema change. Frontend adds an Upload/URL toggle above the existing URL
input; uploading fills the URL field and shows the same preview (`<video>`/`<audio>`
tag) that already renders for pasted URLs.

## Data model changes

One migration, `Viewebit-backend`:
```js
await queryInterface.addColumn('courses', 'pdf_category_id', {
  type: Sequelize.INTEGER, allowNull: true,
  references: { model: 'pdf_categories', key: 'id' }, onDelete: 'SET NULL'
});
await queryInterface.addColumn('courses', 'quiz_category_id', {
  type: Sequelize.INTEGER, allowNull: true,
  references: { model: 'categories', key: 'id' }, onDelete: 'SET NULL'
});
```
`Course.js` model gets the two new fields plus `belongsTo(PdfCategory)` /
`belongsTo(Category, as: 'quizCategoryRoot')` associations (guarded, matching the
existing style in `Lesson.js`).

No other model changes. `Pdfs`, `Assignment`, `Category`, `Question`, `Lesson` are
all reused exactly as they are today.

## New backend endpoints (summary)

| Method | Path | Purpose |
|---|---|---|
| POST | `/educator/courses/:courseUuid/pdfs` | inline PDF upload |
| POST | `/educator/courses/:courseUuid/quiz-categories` | create a quiz (category) under the course |
| POST | `/educator/quiz-hierarchy/categories/:uuid/questions/bulk` | add N questions at once (manual or import-confirm) |
| GET | `/educator/quiz-hierarchy/questions/import-template` | download Excel/CSV template |
| POST | `/educator/quiz-hierarchy/questions/parse-import` | validate an uploaded file, no DB writes |
| POST | `/educator/courses/:courseUuid/lessons/media` | inline video/audio upload |

Assignment creation reuses the existing
`POST /educator/courses/:courseUuid/assignments` unchanged.

## Frontend changes (summary)

- `LessonContentModal.tsx`: Create New/Use Existing toggle for pdf/quiz/assignment
  sections; Upload/URL toggle for video/audio.
- New: `PdfQuickUpload` (inline, small — title + file), `QuizQuickBuilder` (name +
  manual/import question adding, reused by both Quiz and quiz-type Assignment),
  `QuestionFieldsForm` (extracted, shared with `QuizCategoriesPage.tsx`).
- `services/courses.ts`: new methods for the PDF/quiz-category/media endpoints.
- `services/quizHierarchy.ts`: new methods for bulk-create, template download,
  parse-import.
- `types/index.ts`: no breaking changes — new response shapes only.

## Error handling

- Upload validation (mimetype, size, PDF signature) reuses existing utilities and
  error messages so behavior matches the standalone PDF Library exactly.
- Bulk question create is wrapped in a DB transaction — a bad row rolls back the
  whole batch rather than leaving a category half-populated, matching the "confirm
  import" semantics educators would expect from the preview step.
- `parse-import` never writes to the DB, so a bad file can be re-uploaded freely
  with no cleanup needed.
- All new endpoints require `educatorAuth` and re-verify course/category ownership
  by `educator_id`, same as every existing educator-scoped endpoint.

## Testing plan

Real browser E2E (login via OTP flow, as used throughout this project), one pass
through the full new surface:
1. Create a course, open Add Content → PDF → Create New → upload a file → verify it
   appears in PDF Library under an auto-named folder.
2. Add Content → Quiz → Create New → name it → add 2 questions manually → verify
   `categories`/`questions` rows and that the lesson links correctly.
3. Add Content → Quiz → Create New → import a small generated `.xlsx` → verify
   preview counts and that confirmed questions land in the DB.
4. Add Content → Assignment → Create New → text submission type → verify
   `assignments` row is scoped to the right course.
5. Add Content → Video → Upload File → verify the file is stored and the lesson's
   `video_url` resolves and plays.
6. Clean up all test data created during verification (courses/lessons/pdfs/
   categories/questions/assignments), same as prior sessions in this project.
