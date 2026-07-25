# Course Unpublish: Grandfather Existing Students, Block New Ones

## Problem

Today, unpublishing a course (the existing Publish/Unpublish toggle in the
Educator Panel's Course Builder / My Courses, which flips `Course.status`
between `published` and `draft`) is all-or-nothing: the student-facing
`getCourseDetail` endpoint requires `status: 'published'`, so unpublishing a
course instantly 404s it for every student, including ones who already paid
for it, are actively working through it, or have already earned a
certificate from it. There is no way for an educator to stop new signups
while letting existing students keep what they already have.

## Scope

- Applies only to Courses (`Viewebit-backend` `Course` model / student-facing
  course endpoints, and `Viewebit-web`'s course browsing/detail UI).
- Reuses the existing `published` / `draft` / `archived` status values on
  `Course.status` — no new status is introduced. `archived` currently has no
  UI path that sets it and no differentiated behavior from `draft`; this
  change makes both non-`published` states behave identically under the new
  rule, so neither is left with undefined behavior.
- Does not touch standalone TestSeries, PDF, or Quiz-category purchases that
  have no linked Course row — those are unaffected.
- No changes needed to the Educator Panel — the Publish/Unpublish toggle
  already exists and already sends the status values this design consumes.

## Grandfather rule

For a course whose `status !== 'published'`, a specific logged-in student is
considered "already has access" if either of the following is true:

1. **Paid course** (course has a linked `TestSeries` with
   `pricing_type !== 'free'`): the student has a `completed`, unexpired
   `Subscription` row for that test series — the exact same check
   (`resolveCourseAccess`) already used to gate access on published courses.
2. **Free course** (no linked `TestSeries`, or the linked `TestSeries` is
   free): there is no subscription record for free content, so "already
   enrolled" means the student has actually engaged with the course before —
   any `LessonProgress` row for one of the course's lessons, any
   `AssignmentSubmission` for one of the course's assignments, or any
   `Certificate` for the course, all scoped to that student's `user_id`.
   Never having opened it means no grandfathering, even if the course was
   visible to them while published.

A student with no session (`req.user` absent) never has access to a
non-published course.

## Backend changes (`Viewebit-backend`)

### `controllers/CourseController/studentCourseController.js`

- Add `resolveGrandfatheredAccess(course, userId)` implementing the rule
  above (only consumer is this file).
- `getCourseDetail`: drop the `status: 'published'` filter from the initial
  `Course.findOne`. After loading, if `course.status !== 'published'`,
  compute access via `resolveGrandfatheredAccess` instead of the existing
  unconditional `resolveCourseAccess`. If access is false, return 404 exactly
  as today — the course's existence is not revealed to students without
  access.
- `getPublishedCourses`: currently `where: { status: 'published' }`. Change
  to also include non-published courses, filtered down per-request to only
  the ones the current student (`req.user?.uuid`) is grandfathered into via
  `resolveGrandfatheredAccess`. Guests and non-enrolled students see exactly
  what they see today; nothing new appears for them.

### Blocking new purchases

A course being unpublished must also stop brand-new students from buying
their way in via its linked TestSeries.

- `routes/PaymentRoutes/paymentRoutes.js`, `/create-order` (test-series
  branch): after loading the `TestSeries` (`itemDetails`), look up
  `Course.findOne({ where: { test_series_id: itemDetails.id } })`. If found
  and `status !== 'published'`, reject with 400: "This course is not
  currently open for new enrollments." Runs before the Razorpay order is
  created, so no payment is taken.
- `controllers/SubscriptionController/subscriptionController.js`,
  `createSubscription` (direct, non-gateway create endpoint): identical
  guard, placed right after its existing `TestSeries.findByPk` lookup.
- **Deliberately unchanged:**
  - The post-payment webhook/verification step that finalizes the
    `Subscription` row (`paymentRoutes.js` around the `Subscription.create`
    call after payment verification) — blocking there would mean rejecting a
    student who has already paid. The gate belongs before payment, not
    after.
  - `EducatorController/studentInsightsController.js`
    `createManualSubscription` — the educator's manual access-grant tool,
    an explicit override that must keep working regardless of publish
    state.
  - `SubscriptionController/subscriptionController.js`
    `createManualSubscription` — the admin equivalent, same reasoning.

## Frontend changes (`Viewebit-web`)

- `services/courses.ts`: `CourseListItem` gains a `status: string` field.
- `pages/courses/CoursesPage.tsx`: for any course returned with
  `status !== 'published'` (which, per the backend change above, only
  happens when the current student is grandfathered into it), show a small
  badge — e.g. "No longer open for enrollment" — next to the existing
  "Enrolled" badge, so the student understands why it's still listed even
  though new students can no longer join.
- `pages/courses/CoursePlayerPage.tsx` and lesson/assignment views: no
  changes. They already operate purely off `hasAccess`/`locked` fields
  returned by `getCourseDetail`, which continue to work unchanged.

## Error handling / edge cases

- A student whose paid subscription has since expired, and who has no
  activity rows either, loses access to an unpublished course exactly like
  they would have lost access to a still-published paid course whose
  subscription expired — no special-casing needed, `resolveCourseAccess`'s
  existing expiry check already covers this.
- A course with no linked TestSeries and no student activity at all (e.g.
  unpublished the same day it was created) grandfathers nobody — correct,
  since nobody has actually enrolled in it yet.
- Deleting a course still goes through the existing (already-hardened)
  `deleteCourse` safety gate — unrelated to this feature, not re-litigated
  here.

## Testing / verification

No automated test framework exists in either repo (established project
convention). Verification:

1. `node -e "require('./models')"` in `Viewebit-backend` after each change.
2. Read through each changed controller end-to-end to confirm the
   grandfather rule is applied consistently between `getCourseDetail` and
   `getPublishedCourses`.
3. Manual curl walkthrough against a real course flipped to `draft`:
   - An already-subscribed/active student's token still returns full course
     detail.
   - The course still appears in that student's browse list, carrying the
     new badge.
   - A second, non-enrolled student's token gets 404 on detail and the
     course is absent from their browse list.
   - `/create-order` for that course's linked test series returns 400 for a
     new student.
   - The educator's manual-grant endpoint (`createManualSubscription`)
     still succeeds normally.
