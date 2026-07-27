# Institution Pricing Modes: School / Private Educator / Coaching Center

## Problem

Course pricing today is set exclusively by admins, on the `TestSeries` a
course links to — there is no way for an individual private educator to
price their own course, and no way to mark an institution's courses as
always-free (a school). There is also no admin view of `Course` at all: the
Admin Panel's "Course Management" sidebar item actually opens the Test
Series/quiz-bank admin page, and no page lists courses, their educators, or
their institutions.

## Scope

Three repos: `Viewebit-backend`, `Viewebit-EducatorPanel`,
`Viewebit-AdminPanel`. No changes to `Viewebit-web` (student-facing) —
pricing/access-check logic there is untouched, since this feature only
changes *who is allowed to set* a price, not how access is resolved once
set.

## Data model: `Institution.pricing_mode`

New field on `Institution`:

```
pricing_mode: ENUM('school', 'private_educator', 'coaching_center')
  NOT NULL DEFAULT 'coaching_center'
```

One setting per institution — every educator and course under that
institution follows it. Default `'coaching_center'` preserves today's
actual behavior for every existing institution (admin sets all prices),
since that's what happens today regardless of any explicit setting.

New field on `TestSeries`:

```
educator_id: CHAR(36), nullable, references educators.id
```

`CHAR(36)` (not `Sequelize.UUID`, which renders `CHAR(36) BINARY` in MySQL
and would collation-mismatch) — `educators.id` was itself migrated as plain
`CHAR(36)` (`migrations/20260717000004-create-educators.js`), matching the
FK-collation pattern already fixed elsewhere in this codebase this session.

Tracks self-created series so an educator's own priced series is
distinguishable from an admin-created one. `null` for every existing row
(all current series are admin-created) and for every series an admin
creates going forward.

## Mode semantics

### `school`

- Educator Panel's course create/edit forms never show a price field.
- Backend hard-rejects any attempt to set a price for a course under a
  school-mode institution — whether via the (new) price-setting path in
  `createCourse`/`updateCourse`, or the admin "Set Price" action (Admin
  Panel section below). Rejection is a 400, regardless of request origin.
- A school course can still optionally link an existing free TestSeries for
  quiz content (unchanged) — "no pricing" restricts money, not quiz
  functionality.

### `private_educator`

- Educator Panel's course create/edit forms gain a `price` field (decimal,
  optional — omitting it or leaving it 0 means free, same as today).
- On save, if `price > 0`:
  - If the course has no `test_series_id` yet: create a new `TestSeries`
    (`pricing_type: 'paid'`, the given `price`, `currency: 'INR'`,
    `institution_id`: the educator's own, `educator_id`: the educator's
    id), then set `course.test_series_id` to it.
  - If the course already has a `test_series_id` whose `TestSeries.
    educator_id` equals this educator: update that series's `price`
    in place.
  - If the course already has a `test_series_id` whose `TestSeries.
    educator_id` is `null` or belongs to someone else (an admin-created or
    another educator's series): reject with 400 — an educator may only
    price a series they themselves created via this flow, never one
    reachable through the admin-priced dropdown.
- `getAvailableTestSeries` (the dropdown for linking an *existing* series)
  is scoped to `institution_id: req.educator.institution_id` for every
  mode, closing a pre-existing gap where any educator could see and link
  any institution's series.

### `coaching_center`

- Unchanged from today: educators pick from admin-priced series via the
  existing dropdown, or create a course with none yet. No price field is
  shown in Educator Panel.
- Only an admin can set/change the price, via the new Courses page below.

## Backend changes (`Viewebit-backend`)

- New migration: add `pricing_mode` to `institutions` (idempotent,
  default `'coaching_center'`).
- New migration: add `educator_id` to `new_test_series` (nullable,
  `CHAR(36)` to match `admins`/`educators`... — Educator.id is `UUID`
  primary key, so `CHAR(36)` per this codebase's established FK-collation
  fix pattern, referencing `educators.id`).
- `models/Institution.js`: add `pricing_mode` field + association note.
- `models/TestSeries.js`: add `educator_id` field + `belongsTo(Educator)`.
- `controllers/AdminController/institutionController.js`: accept
  `pricing_mode` in `createInstitution`/`updateInstitution`.
- `controllers/EducatorController/courseController.js`:
  - `createCourse`/`updateCourse`: accept an optional `price` field; branch
    on the educator's institution's `pricing_mode` per the rules above.
    Requires loading `req.educator`'s `institution` (via a fresh query or an
    already-loaded association) to read `pricing_mode`.
  - `getAvailableTestSeries`: add `institution_id: req.educator.
    institution_id` to the `where` clause.
- `controllers/EducatorController/educatorAuthController.js`:
  `getProfile` — add `include: [{ model: Institution, as: 'institution',
  attributes: ['id', 'pricing_mode'] }]` so the frontend can read the
  educator's institution mode after login.
- New controller functions for the Admin Courses page (new file
  `controllers/AdminController/courseManagementController.js` — separate
  from the pre-existing, differently-scoped `TestManagementController.js`):
  - `getCourses`: list all courses with educator/institution/status/price
    joined in.
  - `setCoursePrice`: given a course uuid + price, verify the course's
    institution is `coaching_center` mode (400 if not), then create-or-update
    the linked `TestSeries`'s price exactly as `private_educator`'s flow
    does, minus the `educator_id` ownership tag (this one is admin-owned,
    `educator_id: null`).
  - New routes file `routes/AdminRoutes/courseManagementRoutes.js`, mounted
    under `/admin/course-management` (distinct path from the existing
    `/admin/test-management`, which stays untouched).

## Frontend changes (`Viewebit-EducatorPanel`)

- `src/types/index.ts`: `Educator` gains
  `institution?: { id: number; pricing_mode: 'school' | 'private_educator'
  | 'coaching_center' } | null`.
- `src/services/courses.ts`: `createCourse`/`updateCourse` accept an
  optional `price?: number`.
- `src/pages/courses/MyCoursesPage.tsx` (`CreateCourseModal`) and
  `src/components/courses/EditCourseModal.tsx`: read
  `useAuth().educator?.institution?.pricing_mode` — render a `price` input
  only when it's `'private_educator'`; render nothing extra for `'school'`
  or `'coaching_center'`.

## Frontend changes (`Viewebit-AdminPanel`)

- `src/services/branches.ts`: `Institution` interface gains
  `pricing_mode: 'school' | 'private_educator' | 'coaching_center'`;
  `institutionsService` gains `getInstitutions`, `getInstitutionById`,
  `createInstitution`, `updateInstitution`, `deleteInstitution` (mirroring
  `branchesService`'s existing pattern, same file).
- New `src/services/courseManagement.ts`: `getCourses`, `setCoursePrice`.
- New `src/pages/institutions/InstitutionsPage.tsx`: list + create/edit
  modal (name, slug, logo_url, contact_email, is_active, pricing_mode
  dropdown) — mirrors `BranchesPage.tsx`'s existing list+modal structure.
- New `src/pages/courses/AdminCoursesPage.tsx`: list (title, educator,
  institution, status, price/mode), with a "Set Price" button/modal shown
  only on rows where `institution.pricing_mode === 'coaching_center'`.
- `src/components/layout/Sidebar.tsx`: rename the existing "Course
  Management" item (`/test-management`) to "Test Series / Quiz Bank";
  add two new items, "Institutions" (`/institutions`) and "Courses"
  (`/courses`).
- `src/App.tsx`: add routes for `/institutions` and `/courses`.

## Error handling / edge cases

- An institution's `pricing_mode` is changed after courses already have
  prices set under the old mode: existing prices/subscriptions are left
  untouched (changing the mode only affects future price-setting attempts,
  never retroactively strips or blocks already-purchased access).
- A `private_educator` course's price is set, then the institution's mode
  is later changed to `school`: the previously-created `TestSeries` and any
  existing subscriptions are untouched (no forced refund/cleanup) — only
  new price-setting attempts are blocked going forward. Reconciling
  historical data on a mode change is out of scope.
- An educator with no `institution_id` (possible today per the nullable
  field): treated as `coaching_center` (the default), since there's no
  institution to look up a mode from.

## Testing / verification

Same established convention as the rest of this session: `node -e
require(...)` checks + manual curl walkthrough for each mode's
accept/reject behavior on the backend (one institution per mode, confirm
price-setting succeeds/fails as designed, confirm `getAvailableTestSeries`
no longer crosses institutions); `npx tsc --noEmit` + manual click-through
on both Educator Panel (price field visibility per mode) and Admin Panel
(new Institutions and Courses pages, Set Price action, renamed nav item).
