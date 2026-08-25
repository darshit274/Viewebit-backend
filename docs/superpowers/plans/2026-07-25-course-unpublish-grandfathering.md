# Course Unpublish Grandfathering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an educator unpublishes a course (the existing Publish/Unpublish toggle, which sets `Course.status` to `draft` or `archived`), students who already have access keep it, while new students can no longer view, discover, or purchase it.

**Architecture:** A single new helper, `resolveGrandfatheredAccess(course, userId)`, decides per-student access to a non-published course (valid subscription for paid courses, prior activity — lesson progress / assignment submission / certificate — for free courses). Two student-facing read endpoints in `studentCourseController.js` apply it. Two purchase-entry-points (Razorpay order creation, direct subscription creation) gain a pre-payment guard that rejects new purchases against an unpublished course's linked test series. The `Viewebit-web` course list surfaces a badge for the courses this rule keeps visible.

**Tech Stack:** Node.js/Express/Sequelize (MySQL) backend (`Viewebit-backend`), React/TypeScript frontend (`Viewebit-web`). No automated test framework in either repo — verification is `node -e` require-checks plus manual curl/browser walkthroughs, matching this codebase's existing convention.

## Global Constraints

- No new `Course.status` enum value — reuse `published` / `draft` / `archived` exactly as they exist today.
- Never reveal the existence of a non-published, non-grandfathered course to a student — a locked-out student must see the same 404 as a nonexistent course, not a 403 or any other distinguishing signal.
- The purchase-blocking guard is pre-payment only. Do not touch the post-payment webhook/verification step that finalizes a `Subscription` row after a charge has already succeeded.
- Do not touch the educator's manual-grant endpoint (`EducatorController/studentInsightsController.js` `createManualSubscription`) or the admin's manual-subscription endpoint (`SubscriptionController/subscriptionController.js` `createManualSubscription`) — both are explicit overrides that must keep working regardless of publish state.
- Do not modify the Educator Panel — the Publish/Unpublish toggle already exists and already sends the status values this plan consumes.

---

### Task 1: Grandfather-access helper + `getCourseDetail`

**Files:**
- Modify: `Viewebit-backend/controllers/CourseController/studentCourseController.js`

**Interfaces:**
- Produces: `resolveGrandfatheredAccess(course, userId): Promise<boolean>` — exported implicitly as a module-local `const`, consumed by Task 2 in the same file. `course` must be a Sequelize `Course` instance loaded with its `testSeries` association (as already done by both `getPublishedCourses` and `getCourseDetail`); `course.id` and `course.testSeries` are read.

- [ ] **Step 1: Add the new model imports**

In `Viewebit-backend/controllers/CourseController/studentCourseController.js`, replace the top import line:

```js
const { Course, CourseModule, Lesson, TestSeries, Category, Pdfs, Subscription, LessonProgress, Educator } = require('../../models');
```

with:

```js
const { Course, CourseModule, Lesson, TestSeries, Category, Pdfs, Subscription, LessonProgress, Educator, Certificate, Assignment, AssignmentSubmission } = require('../../models');
```

- [ ] **Step 2: Add `hasCourseActivity` and `resolveGrandfatheredAccess` helpers**

Immediately after the existing `resolveCourseAccess` function (ends at the `return !!subscription;` / closing `};` around line 27), insert:

```js
// Whether a student has ever actually engaged with a course — used to decide
// grandfathered access to an unpublished free course, where there's no
// Subscription row to check (free content never creates one).
const hasCourseActivity = async (course, userId) => {
    const certificateCount = await Certificate.count({ where: { course_id: course.id, user_id: userId } });
    if (certificateCount > 0) return true;

    const assignmentIds = (await Assignment.findAll({ where: { course_id: course.id }, attributes: ['id'] })).map((a) => a.id);
    if (assignmentIds.length > 0) {
        const submissionCount = await AssignmentSubmission.count({ where: { assignment_id: assignmentIds, user_id: userId } });
        if (submissionCount > 0) return true;
    }

    const moduleIds = (await CourseModule.findAll({ where: { course_id: course.id }, attributes: ['id'] })).map((m) => m.id);
    if (moduleIds.length > 0) {
        const lessonIds = (await Lesson.findAll({ where: { course_module_id: moduleIds }, attributes: ['id'] })).map((l) => l.id);
        if (lessonIds.length > 0) {
            const progressCount = await LessonProgress.count({ where: { lesson_id: lessonIds, user_id: userId } });
            if (progressCount > 0) return true;
        }
    }

    return false;
};

// Determines whether a student keeps access to a course that has been
// unpublished (status !== 'published'). Paid courses honor an existing valid
// subscription, same as when published; free courses (or courses with no
// linked TestSeries) have no subscription record, so access is grandfathered
// only for students who already engaged with the course before it was
// unpublished.
const resolveGrandfatheredAccess = async (course, userId) => {
    if (!userId) return false;

    if (course.testSeries && course.testSeries.pricing_type !== 'free') {
        const subscription = await Subscription.findOne({
            where: {
                user_id: userId,
                test_series_id: course.testSeries.id,
                status: 'completed',
                [Op.or]: [
                    { expiry_date: null },
                    { expiry_date: { [Op.gt]: new Date() } }
                ]
            }
        });
        if (subscription) return true;
    }

    return hasCourseActivity(course, userId);
};
```

- [ ] **Step 3: Rewire `getCourseDetail` to apply the grandfather rule**

Replace the `getCourseDetail` function's `Course.findOne` call and the access check immediately after it. The current code is:

```js
exports.getCourseDetail = async (req, res, next) => {
    try {
        const userId = req.user?.uuid;
        const course = await Course.findOne({
            where: { uuid: req.params.uuid, status: 'published' },
            include: [
```

Change the `where` clause to drop the status filter:

```js
exports.getCourseDetail = async (req, res, next) => {
    try {
        const userId = req.user?.uuid;
        const course = await Course.findOne({
            where: { uuid: req.params.uuid },
            include: [
```

Then, immediately after the existing `if (!course) return next(new ErrorHandler('Course not found', 404));` line, replace:

```js
        const hasAccess = await resolveCourseAccess(course, userId);
        const courseJson = course.toJSON();
```

with:

```js
        const hasAccess = course.status === 'published'
            ? await resolveCourseAccess(course, userId)
            : await resolveGrandfatheredAccess(course, userId);

        // Unpublished courses stay invisible to students without grandfathered
        // access — the same 404 a nonexistent course would return, so their
        // existence isn't leaked.
        if (course.status !== 'published' && !hasAccess) {
            return next(new ErrorHandler('Course not found', 404));
        }

        const courseJson = course.toJSON();
```

Leave the rest of the function (the free-preview lesson-locking block and the final `res.status(200).json(...)`) unchanged.

- [ ] **Step 4: Verify the file loads without syntax errors**

Run: `cd "Viewebit-backend" && node -e "require('./controllers/CourseController/studentCourseController')"`

Expected: prints the model-load banner (`✅ Exported models: [...]`) with no exception, exit code 0.

- [ ] **Step 5: Manual verification against a running dev server**

1. Start the backend (`npm start` or your existing dev command) with a MySQL instance connected.
2. Pick (or set up) a course with `status: 'draft'` that has at least one `completed` Subscription (paid case) or at least one `LessonProgress`/`AssignmentSubmission`/`Certificate` row (free case) for a specific student.
3. `curl -H "Authorization: Bearer <that student's token>" http://localhost:3000/api/courses/<course-uuid>` — expect `200` with full `modules`/`lessons` content and `"hasAccess": true`.
4. `curl -H "Authorization: Bearer <a different, uninvolved student's token>" http://localhost:3000/api/courses/<course-uuid>` — expect `404`.
5. `curl http://localhost:3000/api/courses/<course-uuid>` (no auth header) — expect `404`.

- [ ] **Step 6: Commit**

```bash
git add controllers/CourseController/studentCourseController.js
git commit -m "feat: grandfather existing student access to unpublished courses"
```

---

### Task 2: Broaden `getPublishedCourses` to include grandfathered courses

**Files:**
- Modify: `Viewebit-backend/controllers/CourseController/studentCourseController.js`

**Interfaces:**
- Consumes: `resolveGrandfatheredAccess(course, userId)` from Task 1 (same file, already in scope).
- Produces: the `/api/courses` list endpoint response gains a `status` field per course item, consumed by Task 4 (`Viewebit-web`).

- [ ] **Step 1: Replace `getPublishedCourses`**

Replace the entire current function:

```js
exports.getPublishedCourses = async (req, res, next) => {
    try {
        const userId = req.user?.uuid;
        const courses = await Course.findAll({
            where: { status: 'published' },
            include: [
                { model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name', 'pricing_type', 'price'] },
                { model: Educator, as: 'educator', attributes: ['id', 'name', 'avatar', 'designation'] }
            ],
            order: [['created_at', 'DESC']]
        });

        const data = await Promise.all(courses.map(async (course) => {
            const hasAccess = await resolveCourseAccess(course, userId);
            return {
                uuid: course.uuid,
                title: course.title,
                description: course.description,
                thumbnail_url: course.thumbnail_url,
                educator: course.educator,
                isPremium: course.testSeries ? course.testSeries.pricing_type === 'paid' : false,
                price: course.testSeries?.price ?? 0,
                hasAccess
            };
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Get published courses error:', err);
        return next(new ErrorHandler('Failed to fetch courses', 500));
    }
};
```

with:

```js
exports.getPublishedCourses = async (req, res, next) => {
    try {
        const userId = req.user?.uuid;
        const includeOptions = [
            { model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name', 'pricing_type', 'price'] },
            { model: Educator, as: 'educator', attributes: ['id', 'name', 'avatar', 'designation'] }
        ];

        const publishedCourses = await Course.findAll({
            where: { status: 'published' },
            include: includeOptions,
            order: [['created_at', 'DESC']]
        });

        // Grandfathered courses: non-published courses this specific student
        // still has access to (see resolveGrandfatheredAccess) — kept visible
        // in their list even though new students can no longer find them.
        let grandfatheredCourses = [];
        if (userId) {
            const unpublishedCourses = await Course.findAll({
                where: { status: { [Op.ne]: 'published' } },
                include: includeOptions,
                order: [['created_at', 'DESC']]
            });
            const accessFlags = await Promise.all(
                unpublishedCourses.map((course) => resolveGrandfatheredAccess(course, userId))
            );
            grandfatheredCourses = unpublishedCourses.filter((_, index) => accessFlags[index]);
        }

        const allCourses = [...publishedCourses, ...grandfatheredCourses];

        const data = await Promise.all(allCourses.map(async (course) => {
            const hasAccess = course.status === 'published'
                ? await resolveCourseAccess(course, userId)
                : true; // already filtered to grandfathered-access-only above

            return {
                uuid: course.uuid,
                title: course.title,
                description: course.description,
                thumbnail_url: course.thumbnail_url,
                status: course.status,
                educator: course.educator,
                isPremium: course.testSeries ? course.testSeries.pricing_type === 'paid' : false,
                price: course.testSeries?.price ?? 0,
                hasAccess
            };
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Get published courses error:', err);
        return next(new ErrorHandler('Failed to fetch courses', 500));
    }
};
```

- [ ] **Step 2: Verify the file loads without syntax errors**

Run: `cd "Viewebit-backend" && node -e "require('./controllers/CourseController/studentCourseController')"`

Expected: prints the model-load banner with no exception, exit code 0.

- [ ] **Step 3: Manual verification against a running dev server**

Using the same draft course and student tokens from Task 1 Step 5:

1. `curl -H "Authorization: Bearer <grandfathered student's token>" http://localhost:3000/api/courses` — expect the draft course to appear in the `data` array with `"status": "draft"` and `"hasAccess": true`.
2. `curl -H "Authorization: Bearer <a different, uninvolved student's token>" http://localhost:3000/api/courses` — expect the draft course to be absent from the array entirely.
3. `curl http://localhost:3000/api/courses` (no auth header) — expect the draft course absent, and all other published courses to look exactly as before this change.

- [ ] **Step 4: Commit**

```bash
git add controllers/CourseController/studentCourseController.js
git commit -m "feat: include grandfathered unpublished courses in student course list"
```

---

### Task 3: Block new purchases against an unpublished course

**Files:**
- Modify: `Viewebit-backend/routes/PaymentRoutes/paymentRoutes.js`
- Modify: `Viewebit-backend/controllers/SubscriptionController/subscriptionController.js`

**Interfaces:**
- Consumes: `Course` model (`test_series_id`, `status` columns) from `Viewebit-backend/models`.
- Produces: both entry points now reject with an HTTP 400 and message `"This course is not currently open for new enrollments."` / `"This course is not currently open for new enrollments"` when the target test series is linked to a non-published course. No other task depends on this one.

- [ ] **Step 1: Add the `Course` import to `paymentRoutes.js`**

In `Viewebit-backend/routes/PaymentRoutes/paymentRoutes.js`, replace:

```js
const { User, TestSeries, Subscription, Pdfs, PdfCategory } = require('../../models');
```

with:

```js
const { User, TestSeries, Subscription, Pdfs, PdfCategory, Course } = require('../../models');
```

- [ ] **Step 2: Add the guard in `/create-order`'s test-series branch**

In the same file, inside the `router.post('/create-order', ...)` handler, find:

```js
      if (itemDetails.pricing_type === 'free') {
        return res.status(400).json({
          success: false,
          message: 'This test series is free. No payment required.'
        });
      }

      amount = Math.round(parseFloat(itemDetails.price) * 100); // Convert to paise
```

Replace with:

```js
      if (itemDetails.pricing_type === 'free') {
        return res.status(400).json({
          success: false,
          message: 'This test series is free. No payment required.'
        });
      }

      const linkedCourse = await Course.findOne({ where: { test_series_id: itemDetails.id } });
      if (linkedCourse && linkedCourse.status !== 'published') {
        return res.status(400).json({
          success: false,
          message: 'This course is not currently open for new enrollments.'
        });
      }

      amount = Math.round(parseFloat(itemDetails.price) * 100); // Convert to paise
```

- [ ] **Step 3: Add the `Course` import to `subscriptionController.js`**

In `Viewebit-backend/controllers/SubscriptionController/subscriptionController.js`, replace:

```js
const { Subscription, User, TestSeries, ExamType, PdfCategory } = require('../../models');
```

with:

```js
const { Subscription, User, TestSeries, ExamType, PdfCategory, Course } = require('../../models');
```

- [ ] **Step 4: Add the guard in `createSubscription`**

In the same file, inside `exports.createSubscription`, find:

```js
        // Check if test series exists
        const testSeries = await TestSeries.findByPk(test_series_id);
        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }
        
        // Check if user already has an active subscription for this test series
```

Replace with:

```js
        // Check if test series exists
        const testSeries = await TestSeries.findByPk(test_series_id);
        if (!testSeries) {
            return next(new ErrorHandler('Test series not found', 404));
        }

        const linkedCourse = await Course.findOne({ where: { test_series_id: testSeries.id } });
        if (linkedCourse && linkedCourse.status !== 'published') {
            return next(new ErrorHandler('This course is not currently open for new enrollments', 400));
        }
        
        // Check if user already has an active subscription for this test series
```

- [ ] **Step 5: Verify both files load without syntax errors**

Run:
```bash
cd "Viewebit-backend"
node -e "require('./routes/PaymentRoutes/paymentRoutes')"
node -e "require('./controllers/SubscriptionController/subscriptionController')"
```

Expected: both print the model-load banner with no exception, exit code 0.

- [ ] **Step 6: Manual verification against a running dev server**

Using the same draft course from Task 1 (linked to a paid test series):

1. `curl -X POST -H "Authorization: Bearer <a new, unsubscribed student's token>" -H "Content-Type: application/json" -d '{"testSeriesId":"<that test series uuid>","planType":"test_series"}' http://localhost:3000/api/payments/create-order` — expect `400` with message `"This course is not currently open for new enrollments."`.
2. `curl -X POST -H "Authorization: Bearer <same student's token>" -H "Content-Type: application/json" -d '{"test_series_id":<that test series numeric id>,"transaction_id":"manual-test-1","amount_paid":1}' http://localhost:3000/api/subscriptions` (adjust route prefix to whatever `subscriptionController.createSubscription` is actually mounted at) — expect `400` with message `"This course is not currently open for new enrollments"`.
3. Repeat both calls against a *published* course's test series — expect both to proceed past this new check (may still fail later for unrelated reasons, e.g. missing Razorpay keys in a local environment — that's fine, the point is this specific 400 does not fire).

- [ ] **Step 7: Commit**

```bash
git add routes/PaymentRoutes/paymentRoutes.js controllers/SubscriptionController/subscriptionController.js
git commit -m "feat: block new subscription purchases for unpublished courses"
```

---

### Task 4: Frontend badge for grandfathered unpublished courses

**Files:**
- Modify: `Viewebit-web/src/services/courses.ts`
- Modify: `Viewebit-web/src/pages/courses/CoursesPage.tsx`

**Interfaces:**
- Consumes: the `status` field added to each `/api/courses` list item by Task 2.

- [ ] **Step 1: Add `status` to `CourseListItem`**

In `Viewebit-web/src/services/courses.ts`, replace:

```ts
export interface CourseListItem {
  uuid: string;
  title: string;
  description?: string;
  thumbnail_url?: string | null;
  educator: { id: string; name: string; avatar?: string | null; designation?: string };
  isPremium: boolean;
  price: number;
  hasAccess: boolean;
}
```

with:

```ts
export interface CourseListItem {
  uuid: string;
  title: string;
  description?: string;
  thumbnail_url?: string | null;
  status: string;
  educator: { id: string; name: string; avatar?: string | null; designation?: string };
  isPremium: boolean;
  price: number;
  hasAccess: boolean;
}
```

- [ ] **Step 2: Show a badge for non-published (grandfathered) courses**

In `Viewebit-web/src/pages/courses/CoursesPage.tsx`, replace:

```tsx
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{course.educator.name}</span>
                  {course.hasAccess ? (
                    <span className="badge badge-green">Enrolled</span>
                  ) : (
                    <span className="badge badge-yellow inline-flex items-center gap-1">
                      <LockClosedIcon className="h-3 w-3" />
                      {course.isPremium ? `₹${course.price}` : 'Locked'}
                    </span>
                  )}
                </div>
```

with:

```tsx
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{course.educator.name}</span>
                  <div className="flex items-center gap-1">
                    {course.status !== 'published' && (
                      <span className="badge badge-blue">No longer open for enrollment</span>
                    )}
                    {course.hasAccess ? (
                      <span className="badge badge-green">Enrolled</span>
                    ) : (
                      <span className="badge badge-yellow inline-flex items-center gap-1">
                        <LockClosedIcon className="h-3 w-3" />
                        {course.isPremium ? `₹${course.price}` : 'Locked'}
                      </span>
                    )}
                  </div>
                </div>
```

(`badge-blue` already exists in `src/index.css`/`src/styles/globals.css`, used elsewhere in this codebase — no new CSS needed.)

- [ ] **Step 3: Verify the TypeScript build**

Run: `cd "Viewebit-web" && npx tsc --noEmit`

Expected: no new errors related to `courses.ts` or `CoursesPage.tsx`.

- [ ] **Step 4: Manual verification**

1. Start the frontend dev server (`npm run dev`).
2. Log in as the grandfathered student from Task 1's setup and open the Courses page — the draft course should appear with both a blue "No longer open for enrollment" badge and the green "Enrolled" badge.
3. Log in as the uninvolved student and confirm the draft course does not appear at all.

- [ ] **Step 5: Commit**

```bash
git add src/services/courses.ts src/pages/courses/CoursesPage.tsx
git commit -m "feat: badge grandfathered unpublished courses in student course list"
```
