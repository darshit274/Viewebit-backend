# Institution Pricing Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each `Institution` a `pricing_mode` (`school` / `private_educator` / `coaching_center`) that determines who is allowed to price a course under it — nobody (school), the educator themself (private_educator), or only an admin (coaching_center, today's existing behavior) — and give the Admin Panel actual visibility into `Course` records (today it has none) plus a way to manage institutions (today there is no UI for this at all).

**Architecture:** A new `Institution.pricing_mode` field is the single source of truth, read wherever a price is about to be set. Pricing continues to physically live on `TestSeries` (unchanged access-check/payment code from prior work) — a new `TestSeries.educator_id` field distinguishes an educator-self-created series from an admin-created one, so an educator can never hijack an admin-managed series's price. Two new Admin Panel pages (Institutions, Courses) fill gaps that exist independent of this feature (no Institution CRUD UI, no Course visibility at all) but are needed to make the setting usable.

**Tech Stack:** Node.js/Express/Sequelize (MySQL) backend; React/TypeScript frontend in both `Viewebit-EducatorPanel` and `Viewebit-AdminPanel`. No automated test framework in any of the three repos — verification is `node -e require(...)` checks + `npx tsc --noEmit` + manual curl/click-through, matching this project's established convention.

## Global Constraints

- No existing institution's behavior may change silently: `pricing_mode` defaults to `'coaching_center'`, which is what every institution already effectively does today (admin-set pricing).
- `school` mode: the backend must reject (400) any attempt to set a course price, regardless of request origin — not just hide the UI.
- `private_educator` mode: an educator may only price a `TestSeries` they created themselves through this flow (`TestSeries.educator_id` matches their own id) — never an admin-created or another educator's series.
- `coaching_center` mode: unchanged educator-side behavior (pick from an admin-priced dropdown, or none); only the new Admin Courses page's "Set Price" action may set/change price, and only for courses under a `coaching_center`-mode institution.
- `getAvailableTestSeries` must be scoped to the requesting educator's own `institution_id` — do not leave it unscoped.
- Do not modify `Viewebit-web` (student-facing) or any access-check/payment code from the prior `course-unpublish-grandfathering` feature — this plan only changes who may set a price, not how access is resolved once set.
- Follow the existing FK-collation pattern already established in this codebase: any new column referencing `educators.id` must be declared `Sequelize.CHAR(36)` in migrations (matching `educators.id`'s own column type, itself `CHAR(36)` per `migrations/20260717000004-create-educators.js`) but `DataTypes.UUID` in the corresponding Sequelize model (see `models/Category.js`'s `educator_id` field for the existing precedent of this exact split).

---

### Task 1: `Institution.pricing_mode`

**Files:**
- Create: `Viewebit-backend/migrations/20260725000001-add-pricing-mode-to-institutions.js`
- Modify: `Viewebit-backend/models/Institution.js`
- Modify: `Viewebit-backend/controllers/AdminController/institutionController.js`

**Interfaces:**
- Produces: `Institution.pricing_mode: 'school' | 'private_educator' | 'coaching_center'`, consumed by Tasks 3 and 4 (backend) and Task 6 (Admin Panel UI).

- [ ] **Step 1: Create the migration**

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('institutions');
    if (!table.pricing_mode) {
      await queryInterface.addColumn('institutions', 'pricing_mode', {
        type: Sequelize.ENUM('school', 'private_educator', 'coaching_center'),
        allowNull: false,
        defaultValue: 'coaching_center'
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('institutions');
    if (table.pricing_mode) {
      await queryInterface.removeColumn('institutions', 'pricing_mode');
    }
  }
};
```

- [ ] **Step 2: Add the field to the model**

In `models/Institution.js`, replace:

```js
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Institution',
```

with:

```js
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    pricing_mode: {
      type: DataTypes.ENUM('school', 'private_educator', 'coaching_center'),
      defaultValue: 'coaching_center',
      allowNull: false,
      comment: 'Who may price courses under this institution: school = always free, private_educator = the educator sets it, coaching_center = only an admin sets it'
    }
  }, {
    sequelize,
    modelName: 'Institution',
```

- [ ] **Step 3: Accept `pricing_mode` in the admin controller**

In `controllers/AdminController/institutionController.js`, replace `createInstitution`:

```js
exports.createInstitution = async (req, res, next) => {
    try {
        const { name, slug, logo_url, contact_email, is_active = true } = req.body;
        if (!name || !slug) {
            return next(new ErrorHandler('Name and slug are required', 400));
        }

        const existing = await Institution.findOne({ where: { slug } });
        if (existing) {
            return next(new ErrorHandler('Institution with this slug already exists', 400));
        }

        const institution = await Institution.create({ name, slug, logo_url, contact_email, is_active });
        res.status(201).json({ success: true, message: 'Institution created successfully', data: institution });
    } catch (err) {
        console.error('Create institution error:', err);
        return next(new ErrorHandler('Failed to create institution', 500));
    }
};
```

with:

```js
const PRICING_MODES = ['school', 'private_educator', 'coaching_center'];

exports.createInstitution = async (req, res, next) => {
    try {
        const { name, slug, logo_url, contact_email, is_active = true, pricing_mode = 'coaching_center' } = req.body;
        if (!name || !slug) {
            return next(new ErrorHandler('Name and slug are required', 400));
        }
        if (!PRICING_MODES.includes(pricing_mode)) {
            return next(new ErrorHandler('Invalid pricing_mode', 400));
        }

        const existing = await Institution.findOne({ where: { slug } });
        if (existing) {
            return next(new ErrorHandler('Institution with this slug already exists', 400));
        }

        const institution = await Institution.create({ name, slug, logo_url, contact_email, is_active, pricing_mode });
        res.status(201).json({ success: true, message: 'Institution created successfully', data: institution });
    } catch (err) {
        console.error('Create institution error:', err);
        return next(new ErrorHandler('Failed to create institution', 500));
    }
};
```

Then replace `updateInstitution`:

```js
exports.updateInstitution = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, slug, logo_url, contact_email, is_active } = req.body;

        const institution = await Institution.findByPk(id);
        if (!institution) return next(new ErrorHandler('Institution not found', 404));

        if (slug && slug !== institution.slug) {
            const existing = await Institution.findOne({ where: { slug, id: { [Op.ne]: id } } });
            if (existing) return next(new ErrorHandler('Institution with this slug already exists', 400));
        }

        await institution.update({
            ...(name !== undefined && { name }),
            ...(slug !== undefined && { slug }),
            ...(logo_url !== undefined && { logo_url }),
            ...(contact_email !== undefined && { contact_email }),
            ...(is_active !== undefined && { is_active })
        });

        res.status(200).json({ success: true, message: 'Institution updated successfully', data: institution });
    } catch (err) {
        console.error('Update institution error:', err);
        return next(new ErrorHandler('Failed to update institution', 500));
    }
};
```

with:

```js
exports.updateInstitution = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, slug, logo_url, contact_email, is_active, pricing_mode } = req.body;

        const institution = await Institution.findByPk(id);
        if (!institution) return next(new ErrorHandler('Institution not found', 404));

        if (slug && slug !== institution.slug) {
            const existing = await Institution.findOne({ where: { slug, id: { [Op.ne]: id } } });
            if (existing) return next(new ErrorHandler('Institution with this slug already exists', 400));
        }

        if (pricing_mode !== undefined && !PRICING_MODES.includes(pricing_mode)) {
            return next(new ErrorHandler('Invalid pricing_mode', 400));
        }

        await institution.update({
            ...(name !== undefined && { name }),
            ...(slug !== undefined && { slug }),
            ...(logo_url !== undefined && { logo_url }),
            ...(contact_email !== undefined && { contact_email }),
            ...(is_active !== undefined && { is_active }),
            ...(pricing_mode !== undefined && { pricing_mode })
        });

        res.status(200).json({ success: true, message: 'Institution updated successfully', data: institution });
    } catch (err) {
        console.error('Update institution error:', err);
        return next(new ErrorHandler('Failed to update institution', 500));
    }
};
```

- [ ] **Step 4: Verify**

Run: `cd Viewebit-backend && node -e "require('./controllers/AdminController/institutionController')"`

Expected: model-load banner, no exception.

- [ ] **Step 5: Commit**

```bash
git add migrations/20260725000001-add-pricing-mode-to-institutions.js models/Institution.js controllers/AdminController/institutionController.js
git commit -m "feat: add pricing_mode to Institution"
```

---

### Task 2: `TestSeries.educator_id`

**Files:**
- Create: `Viewebit-backend/migrations/20260725000002-add-educator-id-to-test-series.js`
- Modify: `Viewebit-backend/models/TestSeries.js`

**Interfaces:**
- Produces: `TestSeries.educator_id: string | null` (a `DataTypes.UUID`-typed field holding an `Educator.id`), consumed by Task 3 and Task 4.

- [ ] **Step 1: Create the migration**

Mirror the existing, already-shipped pattern in
`migrations/20260722000001-add-educator-id-to-categories.js` exactly:

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('new_test_series');
    if (!tableDescription.educator_id) {
      await queryInterface.addColumn('new_test_series', 'educator_id', {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'educators',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addIndex('new_test_series', ['educator_id'], { name: 'idx_test_series_educator' });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('new_test_series');
    if (tableDescription.educator_id) {
      await queryInterface.removeColumn('new_test_series', 'educator_id');
    }
  }
};
```

- [ ] **Step 2: Add the field and association to the model**

In `models/TestSeries.js`, replace:

```js
    institution_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'new_test_series',
```

with:

```js
    institution_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    educator_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Set when this series was self-created by a private-educator-mode Educator via the Course Builder pricing flow, rather than by an Admin'
    }
  }, {
    tableName: 'new_test_series',
```

Then, in the same file's `TestSeries.associate` function, replace:

```js
    if (models.Course) {
      TestSeries.hasOne(models.Course, { foreignKey: 'test_series_id', as: 'course' });
    }
  };
```

with:

```js
    if (models.Course) {
      TestSeries.hasOne(models.Course, { foreignKey: 'test_series_id', as: 'course' });
    }
    if (models.Educator) {
      TestSeries.belongsTo(models.Educator, { foreignKey: 'educator_id', as: 'educator' });
    }
  };
```

- [ ] **Step 3: Verify**

Run: `cd Viewebit-backend && node -e "require('./models')"`

Expected: model-load banner listing all models with no exception (confirms the new association doesn't break model loading).

- [ ] **Step 4: Commit**

```bash
git add migrations/20260725000002-add-educator-id-to-test-series.js models/TestSeries.js
git commit -m "feat: add educator_id to TestSeries for self-owned pricing"
```

---

### Task 3: Educator-side course pricing backend

**Files:**
- Modify: `Viewebit-backend/controllers/EducatorController/courseController.js`
- Modify: `Viewebit-backend/controllers/EducatorController/educatorAuthController.js`

**Interfaces:**
- Consumes: `Institution.pricing_mode` (Task 1), `TestSeries.educator_id` (Task 2).
- Produces: `POST /educator/courses` and `PUT /educator/courses/:uuid` accept an optional `price` field; `GET /educator/profile` response includes `institution: { id, pricing_mode }`; `GET /educator/courses` and `GET /educator/courses/:uuid` responses include `testSeries.price`/`testSeries.pricing_type`/`testSeries.educator_id`. Consumed by Task 5 (Educator Panel frontend).

- [ ] **Step 1: Add the `Institution` import**

In `controllers/EducatorController/courseController.js`, replace:

```js
const { Course, CourseModule, Lesson, TestSeries, Category, Pdfs, Subscription, Certificate, Assignment, AssignmentSubmission, LessonProgress } = require('../../models');
```

with:

```js
const { Course, CourseModule, Lesson, TestSeries, Category, Pdfs, Subscription, Certificate, Assignment, AssignmentSubmission, LessonProgress, Institution } = require('../../models');
```

- [ ] **Step 2: Rewrite `createCourse`**

Replace the entire function:

```js
exports.createCourse = async (req, res, next) => {
    try {
        const { title, description, test_series_id, thumbnail_url } = req.body;
        if (!title) return next(new ErrorHandler('Title is required', 400));

        if (test_series_id) {
            const testSeries = await TestSeries.findByPk(test_series_id);
            if (!testSeries) return next(new ErrorHandler('Test series not found', 404));

            const existing = await Course.findOne({ where: { test_series_id } });
            if (existing) return next(new ErrorHandler('This test series is already linked to another course', 400));
        }

        const course = await Course.create({
            title,
            description,
            thumbnail_url,
            test_series_id: test_series_id || null,
            educator_id: req.educator.id,
            branch_id: req.educator.branch_id,
            department_id: req.educator.department_id
        });

        res.status(201).json({ success: true, message: 'Course created successfully', data: course });
    } catch (err) {
        console.error('Create course error:', err);
        return next(new ErrorHandler('Failed to create course', 500));
    }
};
```

with:

```js
exports.createCourse = async (req, res, next) => {
    try {
        const { title, description, test_series_id, thumbnail_url, price } = req.body;
        if (!title) return next(new ErrorHandler('Title is required', 400));

        const institution = req.educator.institution_id
            ? await Institution.findByPk(req.educator.institution_id, { attributes: ['id', 'pricing_mode'] })
            : null;
        const pricingMode = institution?.pricing_mode || 'coaching_center';

        if (price !== undefined && pricingMode !== 'private_educator') {
            return next(new ErrorHandler('Only private-educator institutions can set course pricing directly', 400));
        }

        let finalTestSeriesId = test_series_id || null;

        if (price !== undefined) {
            // A price always creates and links a fresh, educator-owned series —
            // any test_series_id also present in the request is ignored, so the
            // two inputs never conflict.
            const numericPrice = Number(price);
            if (isNaN(numericPrice) || numericPrice < 0) {
                return next(new ErrorHandler('A valid, non-negative price is required', 400));
            }
            const newSeries = await TestSeries.create({
                name: title,
                pricing_type: numericPrice > 0 ? 'paid' : 'free',
                price: numericPrice,
                currency: 'INR',
                institution_id: req.educator.institution_id || null,
                educator_id: req.educator.id
            });
            finalTestSeriesId = newSeries.id;
        } else if (test_series_id) {
            const testSeries = await TestSeries.findByPk(test_series_id);
            if (!testSeries) return next(new ErrorHandler('Test series not found', 404));

            const existing = await Course.findOne({ where: { test_series_id } });
            if (existing) return next(new ErrorHandler('This test series is already linked to another course', 400));
        }

        const course = await Course.create({
            title,
            description,
            thumbnail_url,
            test_series_id: finalTestSeriesId,
            educator_id: req.educator.id,
            branch_id: req.educator.branch_id,
            department_id: req.educator.department_id
        });

        res.status(201).json({ success: true, message: 'Course created successfully', data: course });
    } catch (err) {
        console.error('Create course error:', err);
        return next(new ErrorHandler('Failed to create course', 500));
    }
};
```

- [ ] **Step 3: Rewrite `updateCourse`**

Replace the entire function:

```js
exports.updateCourse = async (req, res, next) => {
    try {
        const course = await Course.findOne({ where: { uuid: req.params.uuid, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found', 404));

        const { title, description, thumbnail_url, completion_threshold_percent } = req.body;
        await course.update({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(thumbnail_url !== undefined && { thumbnail_url }),
            ...(completion_threshold_percent !== undefined && { completion_threshold_percent })
        });

        res.status(200).json({ success: true, message: 'Course updated successfully', data: course });
    } catch (err) {
        console.error('Update course error:', err);
        return next(new ErrorHandler('Failed to update course', 500));
    }
};
```

with:

```js
exports.updateCourse = async (req, res, next) => {
    try {
        const course = await Course.findOne({ where: { uuid: req.params.uuid, educator_id: req.educator.id } });
        if (!course) return next(new ErrorHandler('Course not found', 404));

        const { title, description, thumbnail_url, completion_threshold_percent, price } = req.body;

        if (price !== undefined) {
            const institution = req.educator.institution_id
                ? await Institution.findByPk(req.educator.institution_id, { attributes: ['id', 'pricing_mode'] })
                : null;
            const pricingMode = institution?.pricing_mode || 'coaching_center';

            if (pricingMode !== 'private_educator') {
                return next(new ErrorHandler('Only private-educator institutions can set course pricing directly', 400));
            }

            const numericPrice = Number(price);
            if (isNaN(numericPrice) || numericPrice < 0) {
                return next(new ErrorHandler('A valid, non-negative price is required', 400));
            }
            const pricingType = numericPrice > 0 ? 'paid' : 'free';

            if (course.test_series_id) {
                const existingSeries = await TestSeries.findByPk(course.test_series_id);
                if (!existingSeries || existingSeries.educator_id !== req.educator.id) {
                    return next(new ErrorHandler('You can only price a test series you created yourself for this course', 400));
                }
                await existingSeries.update({ price: numericPrice, pricing_type: pricingType });
            } else {
                const newSeries = await TestSeries.create({
                    name: title || course.title,
                    pricing_type: pricingType,
                    price: numericPrice,
                    currency: 'INR',
                    institution_id: req.educator.institution_id || null,
                    educator_id: req.educator.id
                });
                await course.update({ test_series_id: newSeries.id });
            }
        }

        await course.update({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(thumbnail_url !== undefined && { thumbnail_url }),
            ...(completion_threshold_percent !== undefined && { completion_threshold_percent })
        });

        res.status(200).json({ success: true, message: 'Course updated successfully', data: course });
    } catch (err) {
        console.error('Update course error:', err);
        return next(new ErrorHandler('Failed to update course', 500));
    }
};
```

- [ ] **Step 4: Scope `getAvailableTestSeries` to the educator's own institution**

Replace:

```js
exports.getAvailableTestSeries = async (req, res, next) => {
    try {
        const alreadyLinked = await Course.findAll({ attributes: ['test_series_id'], where: { test_series_id: { [Op.ne]: null } } });
        const linkedIds = alreadyLinked.map((c) => c.test_series_id);

        const testSeries = await TestSeries.findAll({
            where: { is_active: true, id: { [Op.notIn]: linkedIds.length ? linkedIds : [0] } },
            attributes: ['id', 'uuid', 'name'],
            order: [['name', 'ASC']]
        });
        res.status(200).json({ success: true, data: testSeries });
    } catch (err) {
        console.error('Get available test series error:', err);
        return next(new ErrorHandler('Failed to fetch test series', 500));
    }
};
```

with:

```js
exports.getAvailableTestSeries = async (req, res, next) => {
    try {
        const alreadyLinked = await Course.findAll({ attributes: ['test_series_id'], where: { test_series_id: { [Op.ne]: null } } });
        const linkedIds = alreadyLinked.map((c) => c.test_series_id);

        const testSeries = await TestSeries.findAll({
            where: {
                is_active: true,
                id: { [Op.notIn]: linkedIds.length ? linkedIds : [0] },
                institution_id: req.educator.institution_id || null
            },
            attributes: ['id', 'uuid', 'name'],
            order: [['name', 'ASC']]
        });
        res.status(200).json({ success: true, data: testSeries });
    } catch (err) {
        console.error('Get available test series error:', err);
        return next(new ErrorHandler('Failed to fetch test series', 500));
    }
};
```

- [ ] **Step 5: Return price fields from `getMyCourses` and `getCourseByUuid`**

In the same file, inside `getMyCourses`, replace:

```js
            include: [{ model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name'] }],
```

with:

```js
            include: [{ model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name', 'price', 'pricing_type', 'educator_id'] }],
```

Then, separately, inside `getCourseByUuid` (a different call site — the `TestSeries` include there is one element of a larger array alongside `CourseModule`, not its own single-element array), replace:

```js
            include: [
                { model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name'] },
                {
                    model: CourseModule,
```

with:

```js
            include: [
                { model: TestSeries, as: 'testSeries', attributes: ['id', 'uuid', 'name', 'price', 'pricing_type', 'educator_id'] },
                {
                    model: CourseModule,
```

- [ ] **Step 6: Add `Institution` to profile response**

In `controllers/EducatorController/educatorAuthController.js`, replace:

```js
const { Educator } = require('../../models');
```

with:

```js
const { Educator, Institution } = require('../../models');
```

Then replace `getProfile`:

```js
exports.getProfile = async (req, res, next) => {
    try {
        const educator = await Educator.findByPk(req.educator.id, {
            attributes: { exclude: ['password', 'otp', 'otpExpiry', 'reset_otp', 'reset_otp_expiry', 'reset_token', 'reset_token_expiry', 'current_session_id'] }
        });
        if (!educator) return next(new ErrorHandler('Educator not found', 404));
        res.status(200).json({ success: true, data: educator });
    } catch (err) {
        console.error('Get educator profile error:', err);
        return next(new ErrorHandler('Failed to fetch profile', 500));
    }
};
```

with:

```js
exports.getProfile = async (req, res, next) => {
    try {
        const educator = await Educator.findByPk(req.educator.id, {
            attributes: { exclude: ['password', 'otp', 'otpExpiry', 'reset_otp', 'reset_otp_expiry', 'reset_token', 'reset_token_expiry', 'current_session_id'] },
            include: [{ model: Institution, as: 'institution', attributes: ['id', 'pricing_mode'] }]
        });
        if (!educator) return next(new ErrorHandler('Educator not found', 404));
        res.status(200).json({ success: true, data: educator });
    } catch (err) {
        console.error('Get educator profile error:', err);
        return next(new ErrorHandler('Failed to fetch profile', 500));
    }
};
```

- [ ] **Step 7: Verify**

Run:
```bash
cd Viewebit-backend
node -e "require('./controllers/EducatorController/courseController')"
node -e "require('./controllers/EducatorController/educatorAuthController')"
```

Expected: both print the model-load banner, no exception.

- [ ] **Step 8: Manual verification against a running dev server**

1. Create (or use existing admin API) three institutions, one per `pricing_mode`. Create one educator under each.
2. For the `school`-mode educator: `POST /api/educator/courses` with `{"title":"Test","price":100}` — expect `400`.
3. For the `coaching_center`-mode educator: same request — expect `400`.
4. For the `private_educator`-mode educator: same request — expect `201`, and a new `TestSeries` row created with `pricing_type: 'paid'`, `price: 100`, `educator_id` matching this educator.
5. `GET /api/educator/profile` for any of the three — expect `data.institution.pricing_mode` present and correct.
6. `GET /api/educator/courses/available-test-series` for two educators in different institutions — confirm neither sees the other's unlinked series.

- [ ] **Step 9: Commit**

```bash
git add controllers/EducatorController/courseController.js controllers/EducatorController/educatorAuthController.js
git commit -m "feat: educator-side course pricing gated by institution pricing_mode"
```

---

### Task 4: Admin course-management backend

**Files:**
- Create: `Viewebit-backend/controllers/AdminController/courseManagementController.js`
- Create: `Viewebit-backend/routes/AdminRoutes/courseManagementRoutes.js`
- Modify: `Viewebit-backend/routes/AdminRoutes/adminRoutes.js`

**Interfaces:**
- Consumes: `Institution.pricing_mode` (Task 1), `TestSeries.educator_id` (Task 2).
- Produces: `GET /admin/courses` (list), `PUT /admin/courses/:uuid/price` (set price, `coaching_center`-mode courses only). Consumed by Task 7 (Admin Panel Courses page).

- [ ] **Step 1: Create the controller**

```js
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
```

- [ ] **Step 2: Create the routes file**

```js
const express = require('express');
const router = express.Router();

const courseManagementController = require('../../controllers/AdminController/courseManagementController');
const { adminAuth } = require('../../utils/AdminAuth');

router.get('/', adminAuth, courseManagementController.getCourses);
router.put('/:uuid/price', adminAuth, courseManagementController.setCoursePrice);

module.exports = router;
```

- [ ] **Step 3: Mount the routes**

In `routes/AdminRoutes/adminRoutes.js`, immediately after the existing block:

```js
// Institution / Branch / Department management routes
const institutionRoutes = require('./institutionRoutes');
router.use('/institutions', institutionRoutes);
```

add:

```js

// Course management routes (view all courses + set price for coaching-center institutions)
const courseManagementRoutes = require('./courseManagementRoutes');
router.use('/courses', courseManagementRoutes);
```

- [ ] **Step 4: Verify**

Run:
```bash
cd Viewebit-backend
node -e "require('./controllers/AdminController/courseManagementController')"
node -e "require('./routes/AdminRoutes/adminRoutes')"
```

Expected: both print the model-load banner, no exception.

- [ ] **Step 5: Manual verification against a running dev server**

1. `GET /api/admin/courses` (with a valid admin token) — expect `200` with a list including nested `educator.institution.pricing_mode` and `testSeries` per course.
2. `PUT /api/admin/courses/<uuid>/price` with `{"price": 500}` on a course under a `coaching_center`-mode institution — expect `200`, and the linked `TestSeries` (created if none existed) reflects `price: 500, pricing_type: 'paid'`.
3. Same request on a course under a `school` or `private_educator`-mode institution — expect `400`.

- [ ] **Step 6: Commit**

```bash
git add controllers/AdminController/courseManagementController.js routes/AdminRoutes/courseManagementRoutes.js routes/AdminRoutes/adminRoutes.js
git commit -m "feat: admin course list + set-price endpoint for coaching-center institutions"
```

---

### Task 5: Educator Panel price field UI

**Files:**
- Modify: `Viewebit-EducatorPanel/src/types/index.ts`
- Modify: `Viewebit-EducatorPanel/src/services/courses.ts`
- Modify: `Viewebit-EducatorPanel/src/pages/courses/MyCoursesPage.tsx`
- Modify: `Viewebit-EducatorPanel/src/components/courses/EditCourseModal.tsx`

**Interfaces:**
- Consumes: `price`/`pricing_mode` fields added to the backend in Task 3.

- [ ] **Step 1: Add `institution` to the `Educator` type**

In `src/types/index.ts`, replace:

```ts
export interface Educator {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  designation?: string;
  bio?: string;
  employee_code?: string;
  institution_id?: number | null;
  branch_id?: number | null;
  department_id?: number | null;
  created_at?: string;
  last_login?: string;
}
```

with:

```ts
export interface Educator {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  designation?: string;
  bio?: string;
  employee_code?: string;
  institution_id?: number | null;
  branch_id?: number | null;
  department_id?: number | null;
  institution?: { id: number; pricing_mode: 'school' | 'private_educator' | 'coaching_center' } | null;
  created_at?: string;
  last_login?: string;
}
```

Also, in the same file, replace the `Course` interface's `testSeries` line:

```ts
  testSeries?: { id: number; uuid: string; name: string };
```

with:

```ts
  testSeries?: { id: number; uuid: string; name: string; price?: number; pricing_type?: string; educator_id?: string | null };
```

- [ ] **Step 2: Accept `price` in the course service**

In `src/services/courses.ts`, replace:

```ts
  createCourse: async (data: { title: string; description?: string; test_series_id?: number | null }) => {
    const response = await api.post('/educator/courses', data);
    return response.data;
  },

  updateCourse: async (uuid: string, data: Partial<Course>) => {
    const response = await api.put(`/educator/courses/${uuid}`, data);
    return response.data;
  },
```

with:

```ts
  createCourse: async (data: { title: string; description?: string; test_series_id?: number | null; price?: number }) => {
    const response = await api.post('/educator/courses', data);
    return response.data;
  },

  updateCourse: async (uuid: string, data: Partial<Course> & { price?: number }) => {
    const response = await api.put(`/educator/courses/${uuid}`, data);
    return response.data;
  },
```

- [ ] **Step 3: Add the price field to `CreateCourseModal`**

In `src/pages/courses/MyCoursesPage.tsx`, replace the import block:

```tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Users, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CardSkeleton } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { EditCourseModal } from '../../components/courses/EditCourseModal';
import { coursesService } from '../../services/courses';
import { Course, TestSeriesOption } from '../../types';
```

with:

```tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Users, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CardSkeleton } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { EditCourseModal } from '../../components/courses/EditCourseModal';
import { coursesService } from '../../services/courses';
import { useAuth } from '../../hooks/useAuth';
import { Course, TestSeriesOption } from '../../types';
```

Then replace the entire `CreateCourseModal` component:

```tsx
const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [testSeriesId, setTestSeriesId] = useState('');
  const [testSeriesOptions, setTestSeriesOptions] = useState<TestSeriesOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      coursesService.getAvailableTestSeries().then((res) => setTestSeriesOptions(res.data || [])).catch(() => setTestSeriesOptions([]));
      setTitle('');
      setDescription('');
      setTestSeriesId('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setLoading(true);
    try {
      const response = await coursesService.createCourse({
        title,
        description: description || undefined,
        test_series_id: testSeriesId ? parseInt(testSeriesId) : null,
      });
      toast.success('Course created successfully');
      onSuccess(response.data.uuid);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Course</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Organic Chemistry — Batch 2026"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link to Test Series
              <span className="text-xs text-gray-500 ml-1">(optional — enables quizzes and gates access via existing purchases)</span>
            </label>
            <select
              value={testSeriesId}
              onChange={(e) => setTestSeriesId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">None — video/document only course</option>
              {testSeriesOptions.map((ts) => (
                <option key={ts.id} value={ts.id}>{ts.name}</option>
              ))}
            </select>
          </div>
          <div className="border-t pt-4 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

with:

```tsx
const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { educator } = useAuth();
  const pricingMode = educator?.institution?.pricing_mode || 'coaching_center';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [testSeriesId, setTestSeriesId] = useState('');
  const [price, setPrice] = useState('');
  const [testSeriesOptions, setTestSeriesOptions] = useState<TestSeriesOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      coursesService.getAvailableTestSeries().then((res) => setTestSeriesOptions(res.data || [])).catch(() => setTestSeriesOptions([]));
      setTitle('');
      setDescription('');
      setTestSeriesId('');
      setPrice('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setLoading(true);
    try {
      const response = await coursesService.createCourse({
        title,
        description: description || undefined,
        test_series_id: testSeriesId ? parseInt(testSeriesId) : null,
        ...(pricingMode === 'private_educator' && price ? { price: parseFloat(price) } : {}),
      });
      toast.success('Course created successfully');
      onSuccess(response.data.uuid);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Course</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Organic Chemistry — Batch 2026"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {pricingMode === 'private_educator' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₹)
                <span className="text-xs text-gray-500 ml-1">(optional — leave blank or 0 for a free course)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
          )}
          {pricingMode !== 'private_educator' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link to Test Series
                <span className="text-xs text-gray-500 ml-1">(optional — enables quizzes and gates access via existing purchases)</span>
              </label>
              <select
                value={testSeriesId}
                onChange={(e) => setTestSeriesId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">None — video/document only course</option>
                {testSeriesOptions.map((ts) => (
                  <option key={ts.id} value={ts.id}>{ts.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="border-t pt-4 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

(The "Link to Test Series" dropdown is hidden only for `private_educator` mode, since setting a price there always creates its own dedicated series — showing both would let an educator fill in conflicting inputs. It stays visible for `school` mode, since a school course can still optionally link an existing free series for quiz content — pricing and quiz content are independent concerns.)

- [ ] **Step 4: Add the price field to `EditCourseModal`**

In `src/components/courses/EditCourseModal.tsx`, replace the entire file:

```tsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { coursesService } from '../../services/courses';
import { Course } from '../../types';

interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  course: Course | null;
}

export const EditCourseModal: React.FC<EditCourseModalProps> = ({ isOpen, onClose, onSuccess, course }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && course) {
      setTitle(course.title);
      setDescription(course.description || '');
    }
  }, [isOpen, course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setLoading(true);
    try {
      await coursesService.updateCourse(course.uuid, { title, description: description || undefined });
      toast.success('Course updated');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update course');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Course</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="border-t pt-4 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

with:

```tsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { coursesService } from '../../services/courses';
import { useAuth } from '../../hooks/useAuth';
import { Course } from '../../types';

interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  course: Course | null;
}

export const EditCourseModal: React.FC<EditCourseModalProps> = ({ isOpen, onClose, onSuccess, course }) => {
  const { educator } = useAuth();
  const pricingMode = educator?.institution?.pricing_mode || 'coaching_center';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && course) {
      setTitle(course.title);
      setDescription(course.description || '');
      setPrice(course.testSeries?.price !== undefined && course.testSeries?.price !== null ? String(course.testSeries.price) : '');
    }
  }, [isOpen, course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setLoading(true);
    try {
      await coursesService.updateCourse(course.uuid, {
        title,
        description: description || undefined,
        ...(pricingMode === 'private_educator' ? { price: price ? parseFloat(price) : 0 } : {}),
      });
      toast.success('Course updated');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update course');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Course</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {pricingMode === 'private_educator' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₹)
                <span className="text-xs text-gray-500 ml-1">(0 for a free course)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
          )}
          <div className="border-t pt-4 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Verify the TypeScript build**

Run: `cd Viewebit-EducatorPanel && npx tsc --noEmit`

Expected: no new errors related to the four changed files.

- [ ] **Step 6: Manual verification**

1. Log in as a `private_educator`-mode educator, open "Create Course" — confirm the Price field shows and the Test Series dropdown is hidden; create a course with a price, confirm success.
2. Open "Edit" on that course — confirm the price prefills with the value just set.
3. Log in as a `school`- or `coaching_center`-mode educator — confirm neither Create nor Edit shows a Price field, and the Test Series dropdown still works as before.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/services/courses.ts src/pages/courses/MyCoursesPage.tsx src/components/courses/EditCourseModal.tsx
git commit -m "feat: course price field in Educator Panel, gated by institution pricing_mode"
```

---

### Task 6: Admin Panel Institutions page

**Files:**
- Modify: `Viewebit-AdminPanel/src/services/branches.ts`
- Create: `Viewebit-AdminPanel/src/pages/institutions/InstitutionsPage.tsx`
- Modify: `Viewebit-AdminPanel/src/components/layout/Sidebar.tsx`
- Modify: `Viewebit-AdminPanel/src/App.tsx`

**Interfaces:**
- Consumes: the already-existing (this task adds no backend work) `GET/POST/PUT/DELETE /admin/institutions` endpoints, now also accepting/returning `pricing_mode` (Task 1).

- [ ] **Step 1: Extend `institutionsService` and the `Institution` type**

In `src/services/branches.ts`, replace:

```ts
export interface Institution {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  contact_email?: string | null;
  is_active: boolean;
}
```

with:

```ts
export interface Institution {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  contact_email?: string | null;
  is_active: boolean;
  pricing_mode: 'school' | 'private_educator' | 'coaching_center';
}
```

Then replace:

```ts
export const institutionsService = {
  getInstitutionsForDropdown: async (): Promise<{ success: boolean; data: Institution[] }> => {
    const response = await api.get('/admin/institutions/dropdown');
    return response.data;
  },
};
```

with:

```ts
export const institutionsService = {
  getInstitutionsForDropdown: async (): Promise<{ success: boolean; data: Institution[] }> => {
    const response = await api.get('/admin/institutions/dropdown');
    return response.data;
  },

  getInstitutions: async (params?: { search?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`/admin/institutions?${queryParams}`);
    return response.data;
  },

  getInstitutionById: async (id: number) => {
    const response = await api.get(`/admin/institutions/${id}`);
    return response.data;
  },

  createInstitution: async (data: {
    name: string;
    slug: string;
    logo_url?: string;
    contact_email?: string;
    pricing_mode: 'school' | 'private_educator' | 'coaching_center';
  }) => {
    const response = await api.post('/admin/institutions', data);
    return response.data;
  },

  updateInstitution: async (id: number, data: Partial<Institution>) => {
    const response = await api.put(`/admin/institutions/${id}`, data);
    return response.data;
  },

  deleteInstitution: async (id: number) => {
    const response = await api.delete(`/admin/institutions/${id}`);
    return response.data;
  },
};
```

- [ ] **Step 2: Create the Institutions page**

Mirrors `src/pages/branches/BranchesPage.tsx`'s existing list+modal structure.

```tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CardSkeleton } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { institutionsService, Institution } from '../../services/branches';

const PRICING_MODE_LABELS: Record<Institution['pricing_mode'], string> = {
  school: 'School (always free)',
  private_educator: 'Private Educator (educator sets price)',
  coaching_center: 'Coaching Center (admin sets price)',
};

interface InstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  institution: Institution | null;
  onSuccess: () => void;
}

const InstitutionModal: React.FC<InstitutionModalProps> = ({ isOpen, onClose, institution, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo_url: '',
    contact_email: '',
    pricing_mode: 'coaching_center' as Institution['pricing_mode'],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (institution) {
      setFormData({
        name: institution.name || '',
        slug: institution.slug || '',
        logo_url: institution.logo_url || '',
        contact_email: institution.contact_email || '',
        pricing_mode: institution.pricing_mode || 'coaching_center',
      });
    } else {
      setFormData({ name: '', slug: '', logo_url: '', contact_email: '', pricing_mode: 'coaching_center' });
    }
  }, [institution, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (institution) {
        await institutionsService.updateInstitution(institution.id, formData);
        toast.success('Institution updated successfully');
      } else {
        await institutionsService.createInstitution(formData);
        toast.success('Institution created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save institution');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{institution ? 'Edit Institution' : 'Add Institution'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Institution Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. ABC Public School"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. abc-public-school"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
            <input
              type="text"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Mode *</label>
            <select
              value={formData.pricing_mode}
              onChange={(e) => setFormData({ ...formData, pricing_mode: e.target.value as Institution['pricing_mode'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              {(Object.keys(PRICING_MODE_LABELS) as Institution['pricing_mode'][]).map((mode) => (
                <option key={mode} value={mode}>{PRICING_MODE_LABELS[mode]}</option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Saving...' : institution ? 'Update Institution' : 'Create Institution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const InstitutionsPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, institution: null as Institution | null, loading: false });

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const response = await institutionsService.getInstitutions({ search: searchTerm });
      setInstitutions(response.data || []);
    } catch (error) {
      toast.error('Failed to load institutions');
      setInstitutions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadInstitutions();
  };

  const handleAdd = () => {
    setSelectedInstitution(null);
    setShowModal(true);
  };

  const handleEdit = (institution: Institution) => {
    setSelectedInstitution(institution);
    setShowModal(true);
  };

  const handleDelete = (institution: Institution) => {
    setConfirmModal({ isOpen: true, institution, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!confirmModal.institution) return;
    setConfirmModal((prev) => ({ ...prev, loading: true }));
    try {
      await institutionsService.deleteInstitution(confirmModal.institution.id);
      toast.success('Institution deleted successfully');
      loadInstitutions();
      setConfirmModal({ isOpen: false, institution: null, loading: false });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete institution');
      setConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Institutions</h1>
          <p className="text-gray-600">Manage schools, private educators, and coaching centers on the platform</p>
        </div>
        <button onClick={handleAdd} className="btn-primary inline-flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Institution
        </button>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search institutions by name or slug..."
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary">Search</button>
        </form>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Institutions</h3>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : institutions.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No institutions found</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first institution.</p>
            <button onClick={handleAdd} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Institution
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {institutions.map((institution) => (
              <div key={institution.uuid} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-primary-50">
                      <Building2 className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{institution.name}</h4>
                      <p className="text-sm text-gray-600">{institution.slug}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${institution.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {institution.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-sm text-gray-500">{PRICING_MODE_LABELS[institution.pricing_mode]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleEdit(institution)} className="p-2 text-gray-400 hover:text-primary-600">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(institution)} className="p-2 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InstitutionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        institution={selectedInstitution}
        onSuccess={loadInstitutions}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, institution: null, loading: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Institution"
        message={`Are you sure you want to delete "${confirmModal.institution?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        loading={confirmModal.loading}
      />
    </div>
  );
};
```

- [ ] **Step 3: Add the sidebar nav item**

In `src/components/layout/Sidebar.tsx`, replace:

```tsx
  { name: 'Branches & Departments', href: '/branches', icon: Building2 },
```

with:

```tsx
  { name: 'Institutions', href: '/institutions', icon: Building2 },
  { name: 'Branches & Departments', href: '/branches', icon: Building2 },
```

- [ ] **Step 4: Add the route**

In `src/App.tsx`, add the import alongside the other page imports:

```tsx
import { InstitutionsPage } from './pages/institutions/InstitutionsPage';
```

Then, immediately before the existing:

```tsx
        <Route path="branches" element={
          <ProtectedRoute>
            <BranchesPage />
          </ProtectedRoute>
        } />
```

add:

```tsx
        <Route path="institutions" element={
          <ProtectedRoute>
            <InstitutionsPage />
          </ProtectedRoute>
        } />
```

- [ ] **Step 5: Verify the TypeScript build**

Run: `cd Viewebit-AdminPanel && npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 6: Manual verification**

1. Start the dev server, log in as an admin, click "Institutions" in the sidebar.
2. Create a new institution, setting `pricing_mode` to each of the three values across a couple of test institutions; confirm the list shows the correct label for each.
3. Edit an existing institution's `pricing_mode` and confirm it persists.

- [ ] **Step 7: Commit**

```bash
git add src/services/branches.ts src/pages/institutions/InstitutionsPage.tsx src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "feat: add Institutions management page to Admin Panel"
```

---

### Task 7: Admin Panel Courses page + sidebar rename

**Files:**
- Create: `Viewebit-AdminPanel/src/services/courseManagement.ts`
- Create: `Viewebit-AdminPanel/src/pages/courses/AdminCoursesPage.tsx`
- Modify: `Viewebit-AdminPanel/src/components/layout/Sidebar.tsx`
- Modify: `Viewebit-AdminPanel/src/App.tsx`

**Interfaces:**
- Consumes: `GET /admin/courses`, `PUT /admin/courses/:uuid/price` (Task 4).

- [ ] **Step 1: Create the course-management service**

```ts
import api from './api';

export interface AdminCourseListItem {
  uuid: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  educator?: {
    id: string;
    name: string;
    email: string;
    institution?: { id: number; name: string; pricing_mode: 'school' | 'private_educator' | 'coaching_center' } | null;
  } | null;
  testSeries?: { id: number; uuid: string; name: string; pricing_type: string; price: number; currency: string } | null;
}

export const courseManagementService = {
  getCourses: async (): Promise<{ success: boolean; data: AdminCourseListItem[] }> => {
    const response = await api.get('/admin/courses');
    return response.data;
  },

  setCoursePrice: async (uuid: string, price: number) => {
    const response = await api.put(`/admin/courses/${uuid}/price`, { price });
    return response.data;
  },
};
```

- [ ] **Step 2: Create the Courses page**

```tsx
import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { CardSkeleton } from '../../components/common/LoadingSpinner';
import { courseManagementService, AdminCourseListItem } from '../../services/courseManagement';

const STATUS_BADGE: Record<AdminCourseListItem['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-800',
};

interface SetPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: AdminCourseListItem | null;
  onSuccess: () => void;
}

const SetPriceModal: React.FC<SetPriceModalProps> = ({ isOpen, onClose, course, onSuccess }) => {
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && course) {
      setPrice(course.testSeries?.price !== undefined && course.testSeries?.price !== null ? String(course.testSeries.price) : '');
    }
  }, [isOpen, course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    setLoading(true);
    try {
      await courseManagementService.setCoursePrice(course.uuid, price ? parseFloat(price) : 0);
      toast.success('Price updated');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to set price');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Set Price — {course.title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (₹)
              <span className="text-xs text-gray-500 ml-1">(0 for a free course)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0"
              autoFocus
            />
          </div>
          <div className="border-t pt-4 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Saving...' : 'Save Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<AdminCourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceModalCourse, setPriceModalCourse] = useState<AdminCourseListItem | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await courseManagementService.getCourses();
      setCourses(response.data || []);
    } catch (error) {
      toast.error('Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <p className="text-gray-600">Every course created by an educator, across all institutions</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {courses.map((course) => {
              const pricingMode = course.educator?.institution?.pricing_mode || 'coaching_center';
              return (
                <div key={course.uuid} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-primary-50">
                        <BookOpen className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{course.title}</h4>
                        <p className="text-sm text-gray-600">
                          {course.educator?.name || 'Unknown educator'} · {course.educator?.institution?.name || 'No institution'}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[course.status]}`}>
                            {course.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {course.testSeries
                              ? course.testSeries.pricing_type === 'paid'
                                ? `₹${course.testSeries.price}`
                                : 'Free'
                              : 'No pricing set'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {pricingMode === 'coaching_center' && (
                      <button
                        onClick={() => setPriceModalCourse(course)}
                        className="px-3 py-1.5 text-sm font-medium text-primary-600 border border-primary-200 rounded-md hover:bg-primary-50"
                      >
                        Set Price
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SetPriceModal
        isOpen={!!priceModalCourse}
        onClose={() => setPriceModalCourse(null)}
        course={priceModalCourse}
        onSuccess={loadCourses}
      />
    </div>
  );
};

export default AdminCoursesPage;
```

- [ ] **Step 3: Rename the mislabeled nav item and add the new one**

In `src/components/layout/Sidebar.tsx`, replace:

```tsx
  { name: 'Course Management', href: '/test-management', icon: BookOpen },
```

with:

```tsx
  { name: 'Test Series / Quiz Bank', href: '/test-management', icon: BookOpen },
  { name: 'Courses', href: '/courses', icon: BookOpen },
```

- [ ] **Step 4: Add the route**

In `src/App.tsx`, add the import alongside the other page imports:

```tsx
import AdminCoursesPage from './pages/courses/AdminCoursesPage';
```

Then, immediately after the existing:

```tsx
        <Route path="test-management" element={
          <ProtectedRoute>
            <TestManagementPageNew />
          </ProtectedRoute>
        } />
```

add:

```tsx
        <Route path="courses" element={
          <ProtectedRoute>
            <AdminCoursesPage />
          </ProtectedRoute>
        } />
```

- [ ] **Step 5: Verify the TypeScript build**

Run: `cd Viewebit-AdminPanel && npx tsc --noEmit`

Expected: no new errors.

- [ ] **Step 6: Manual verification**

1. Confirm the sidebar now shows "Test Series / Quiz Bank" (unchanged page underneath) and a new "Courses" item.
2. Open "Courses" — confirm it lists courses with educator/institution/status/price, and "Set Price" only appears on `coaching_center`-mode rows.
3. Click "Set Price" on one, save, confirm the price/status updates in the list.

- [ ] **Step 7: Commit**

```bash
git add src/services/courseManagement.ts src/pages/courses/AdminCoursesPage.tsx src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "feat: add admin Courses page with Set Price action, rename mislabeled nav item"
```
