# GDPR Data Subject Rights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `super_admin`/`institution_admin` staff a real, auditable way to fulfill GDPR data-access and erasure requests for students and educators, and correct the Viewebit-web Privacy Policy and cookie-consent gaps, so "GDPR compliant" reflects actual working tooling instead of a marketing claim.

**Architecture:** A new admin-only `/admin/gdpr/*` API surface (backend) backs a new "Privacy & Data Requests" page (Admin Panel). Erasure is implemented as anonymization (scrub PII, keep the row and everything referencing it — including financial/subscription records — intact under the same, now-anonymized id) rather than hard deletion, so it satisfies GDPR erasure without conflicting with tax-retention law. Every export or anonymize action writes an audit row to a new `data_subject_requests` table. `Viewebit-web` gets targeted Privacy Policy copy fixes (naming real third parties and the actual retention/erasure mechanism) and a new cookie-consent banner.

**Tech Stack:** Node.js/Express/Sequelize (MySQL) backend; React/TypeScript Admin Panel; React/TypeScript/Redux `Viewebit-web`. No automated test framework in any of the three repos (`npm test` is a stub in the backend) — verification is `node -e "require('./models')"` / `npx tsc --noEmit` / manual walkthroughs, matching this project's established convention.

## Global Constraints

- Admin-mediated only: there is no self-service export/erasure UI for students or educators in this plan. Every DSR action is performed by a `super_admin` or `institution_admin` through the Admin Panel.
- Anonymize, never hard-delete: `Subscription`/payment rows, `Course`/`Assignment`/`LiveSession` content, `TestSession`/answer history, and `Certificate` rows are never touched by the anonymize endpoint — only the `User`/`Educator` row's PII fields are scrubbed.
- Every `export` or `anonymize` action must write exactly one row to `data_subject_requests` — this is the audit trail the whole feature exists to produce. No action succeeds without a corresponding logged row (if the log write fails inside the anonymize transaction, the whole transaction rolls back).
- `institution_admin` may only act on subjects whose `institution_id` matches `req.admin.institution_id` (403 otherwise). `super_admin` is unrestricted (its own `institution_id` is typically `NULL`, consistent with the existing pattern from the Institution Pricing Modes work).
- `anonymize` requires a non-blank `reason` in the request body (400 if missing); `export` does not require one.
- `anonymize` is idempotent-guarded: 400 if the subject is already `is_anonymized`.
- All new migrations are additive and guarded (`describeTable`/`showAllTables` check before `addColumn`/`createTable`), matching every existing migration in this codebase — never destructive.
- Password-equivalent scrubbing uses `bcryptjs` (`bcrypt.hash(x, 10)`), matching `controllers/AuthController/authController.js`.
- Multi-write backend operations use the existing transaction pattern: `let transaction; try { transaction = await sequelize.transaction(); ...; await transaction.commit(); } catch (err) { if (transaction && !transaction.finished) await transaction.rollback(); ... }`, matching `controllers/EducatorController/courseController.js`.
- Do not touch `Viewebit-EducatorPanel` — DSR requests are fulfilled by admin staff, not educators.

---

### Task 1: Anonymization columns + audit log table

**Files:**
- Create: `Viewebit-backend/migrations/20260731000001-add-gdpr-fields-to-users.js`
- Create: `Viewebit-backend/migrations/20260731000002-add-gdpr-fields-to-educators.js`
- Create: `Viewebit-backend/migrations/20260731000003-create-data-subject-requests.js`
- Create: `Viewebit-backend/models/DataSubjectRequest.js`
- Modify: `Viewebit-backend/models/user.js`
- Modify: `Viewebit-backend/models/Educator.js`

**Interfaces:**
- Produces: `User.is_anonymized: boolean`, `User.anonymized_at: Date|null`, `Educator.is_anonymized: boolean`, `Educator.anonymized_at: Date|null`, and model `DataSubjectRequest` (`subject_type: 'student'|'educator'`, `subject_uuid: string`, `request_type: 'export'|'anonymize'`, `performed_by_admin_id: string`, `institution_id: number|null`, `reason: string|null`, `created_at: Date`) — all consumed by Tasks 2-4.

- [ ] **Step 1: Migration — add GDPR columns to `users`**

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');

    if (!table.is_anonymized) {
      await queryInterface.addColumn('users', 'is_anonymized', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!table.anonymized_at) {
      await queryInterface.addColumn('users', 'anonymized_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('users');
    if (table.anonymized_at) await queryInterface.removeColumn('users', 'anonymized_at');
    if (table.is_anonymized) await queryInterface.removeColumn('users', 'is_anonymized');
  }
};
```

Save as `migrations/20260731000001-add-gdpr-fields-to-users.js`.

- [ ] **Step 2: Migration — add GDPR columns to `educators`**

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('educators');

    if (!table.is_anonymized) {
      await queryInterface.addColumn('educators', 'is_anonymized', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!table.anonymized_at) {
      await queryInterface.addColumn('educators', 'anonymized_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('educators');
    if (table.anonymized_at) await queryInterface.removeColumn('educators', 'anonymized_at');
    if (table.is_anonymized) await queryInterface.removeColumn('educators', 'is_anonymized');
  }
};
```

Save as `migrations/20260731000002-add-gdpr-fields-to-educators.js`.

- [ ] **Step 3: Migration — create `data_subject_requests`**

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('data_subject_requests')) {
      return;
    }

    await queryInterface.createTable('data_subject_requests', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      subject_type: {
        type: Sequelize.ENUM('student', 'educator'),
        allowNull: false
      },
      subject_uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false
      },
      request_type: {
        type: Sequelize.ENUM('export', 'anonymize'),
        allowNull: false
      },
      performed_by_admin_id: {
        type: Sequelize.CHAR(36),
        allowNull: false
      },
      institution_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('data_subject_requests', ['subject_type', 'subject_uuid'], { name: 'dsr_subject' });
    await queryInterface.addIndex('data_subject_requests', ['institution_id'], { name: 'dsr_institution' });
    await queryInterface.addIndex('data_subject_requests', ['created_at'], { name: 'dsr_created_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('data_subject_requests');
  }
};
```

Save as `migrations/20260731000003-create-data-subject-requests.js`. No `updated_at` — this is an append-only audit log, never edited after creation.

- [ ] **Step 4: Add the fields to `models/user.js`**

In `models/user.js`, replace:

```js
    applied_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
```

with:

```js
    applied_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_anonymized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    anonymized_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
```

- [ ] **Step 5: Add the fields to `models/Educator.js`**

In `models/Educator.js`, replace:

```js
    quiz_bank_test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'A private TestSeries container auto-created to hold this educator\'s own quiz Category tree'
    }
  }, {
    sequelize,
    modelName: 'Educator',
```

with:

```js
    quiz_bank_test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'A private TestSeries container auto-created to hold this educator\'s own quiz Category tree'
    },
    is_anonymized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    anonymized_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Educator',
```

- [ ] **Step 6: Create `models/DataSubjectRequest.js`**

```js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DataSubjectRequest extends Model {
    static associate(models) {
      // Intentionally no belongsTo/FK constraint on subject_uuid or
      // performed_by_admin_id: the subject may be a User or an Educator
      // depending on subject_type, and this table must remain a readable
      // audit trail even after the subject row is anonymized or an admin
      // account is later deactivated.
    }
  }

  DataSubjectRequest.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    subject_type: {
      type: DataTypes.ENUM('student', 'educator'),
      allowNull: false
    },
    subject_uuid: {
      type: DataTypes.UUID,
      allowNull: false
    },
    request_type: {
      type: DataTypes.ENUM('export', 'anonymize'),
      allowNull: false
    },
    performed_by_admin_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    institution_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'DataSubjectRequest',
    tableName: 'data_subject_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return DataSubjectRequest;
};
```

- [ ] **Step 7: Run the migrations and verify models load**

Run: `cd Viewebit-backend && npx sequelize-cli db:migrate` (against a reachable dev/staging DB if one exists — if none is reachable, skip running and rely on Step 8 plus a careful read-through of each `up()`/`down()`).

Run: `node -e "require('./models')"`
Expected: prints `✅ Exported models: [...]` including `DataSubjectRequest`, `User`, `Educator`, with no thrown errors.

- [ ] **Step 8: Commit**

```bash
git add migrations/20260731000001-add-gdpr-fields-to-users.js migrations/20260731000002-add-gdpr-fields-to-educators.js migrations/20260731000003-create-data-subject-requests.js models/DataSubjectRequest.js models/user.js models/Educator.js
git commit -m "feat: add GDPR anonymization fields and data_subject_requests audit table"
```

---

### Task 2: GDPR search + export endpoints

**Files:**
- Create: `Viewebit-backend/controllers/AdminController/gdprController.js`
- Create: `Viewebit-backend/routes/AdminRoutes/gdprRoutes.js`
- Modify: `Viewebit-backend/routes/AdminRoutes/adminRoutes.js`

**Interfaces:**
- Consumes: `User`, `Educator`, `TestSession`, `Subscription`, `Notification`, `PushToken`, `LeaderboardEntry`, `QuestionReport`, `AssignmentSubmission`, `LessonProgress`, `LiveSessionAttendance`, `Certificate`, `Course`, `Assignment`, `LiveSession`, `DataSubjectRequest` (Task 1), `sequelize` — all from `../../models`. `adminAuth`, `requireRole` from `../../utils/AdminAuth`.
- Produces: `gdprController.searchSubject`, `gdprController.exportSubject` (this task); `gdprController.anonymizeSubject` (Task 3) and `gdprController.listRequests` (Task 4) are added to the same file later. Routes mounted at `/admin/gdpr` — consumed by Task 5 (Admin Panel).

- [ ] **Step 1: Create the controller with search + export**

```js
const ErrorHandler = require('../../utils/default/errorHandler');
const {
  User, Educator, TestSession, Subscription, Notification, PushToken,
  LeaderboardEntry, QuestionReport, AssignmentSubmission, LessonProgress,
  LiveSessionAttendance, Certificate, Course, Assignment, LiveSession,
  DataSubjectRequest
} = require('../../models');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidSubjectType(subjectType, next) {
  if (!['student', 'educator'].includes(subjectType)) {
    next(new ErrorHandler('subjectType must be "student" or "educator"', 400));
    return false;
  }
  return true;
}

function assertInstitutionScope(req, subject, next) {
  if (req.admin.role === 'institution_admin' && subject.institution_id !== req.admin.institution_id) {
    next(new ErrorHandler('This record belongs to a different institution', 403));
    return false;
  }
  return true;
}

exports.searchSubject = async (req, res, next) => {
  try {
    const { query, subjectType } = req.query;
    if (!query || !subjectType) {
      return next(new ErrorHandler('query and subjectType are required', 400));
    }
    if (!assertValidSubjectType(subjectType, next)) return;

    const Model = subjectType === 'student' ? User : Educator;
    const idField = subjectType === 'student' ? 'uuid' : 'id';
    const where = UUID_RE.test(query) ? { [idField]: query } : { email: query };

    const subject = await Model.findOne({ where });
    if (!subject) return next(new ErrorHandler('No matching record found', 404));
    if (!assertInstitutionScope(req, subject, next)) return;

    res.status(200).json({
      success: true,
      data: {
        subjectType,
        uuid: subjectType === 'student' ? subject.uuid : subject.id,
        name: subjectType === 'student' ? subject.fullName : subject.name,
        email: subject.email,
        institution_id: subject.institution_id,
        is_anonymized: subject.is_anonymized
      }
    });
  } catch (err) {
    console.error('GDPR search error:', err);
    return next(new ErrorHandler('Failed to search for subject', 500));
  }
};

exports.exportSubject = async (req, res, next) => {
  try {
    const { subjectType, uuid } = req.params;
    if (!assertValidSubjectType(subjectType, next)) return;

    const Model = subjectType === 'student' ? User : Educator;
    const idField = subjectType === 'student' ? 'uuid' : 'id';
    const subject = await Model.findOne({ where: { [idField]: uuid } });
    if (!subject) return next(new ErrorHandler('No matching record found', 404));
    if (!assertInstitutionScope(req, subject, next)) return;

    let payload;
    if (subjectType === 'student') {
      const [
        testSessions, subscriptions, notifications, pushTokens, leaderboardEntries,
        submittedReports, reviewedReports, assignmentSubmissions, lessonProgress,
        liveSessionAttendance, certificates
      ] = await Promise.all([
        TestSession.findAll({ where: { user_id: uuid } }),
        Subscription.findAll({ where: { user_id: uuid } }),
        Notification.findAll({ where: { user_id: uuid } }),
        PushToken.findAll({ where: { user_id: uuid } }),
        LeaderboardEntry.findAll({ where: { user_id: uuid } }),
        QuestionReport.findAll({ where: { user_id: uuid } }),
        QuestionReport.findAll({ where: { reviewed_by: uuid } }),
        AssignmentSubmission.findAll({ where: { user_id: uuid } }),
        LessonProgress.findAll({ where: { user_id: uuid } }),
        LiveSessionAttendance.findAll({ where: { user_id: uuid } }),
        Certificate.findAll({ where: { user_id: uuid } })
      ]);

      payload = {
        subjectType, profile: subject.toJSON(), testSessions, subscriptions, notifications,
        pushTokens, leaderboardEntries, submittedReports, reviewedReports,
        assignmentSubmissions, lessonProgress, liveSessionAttendance, certificates
      };
    } else {
      const [courses, assignments, liveSessions] = await Promise.all([
        Course.findAll({ where: { educator_id: uuid }, attributes: ['uuid', 'title', 'status', 'created_at'] }),
        Assignment.findAll({ where: { educator_id: uuid } }),
        LiveSession.findAll({ where: { educator_id: uuid } })
      ]);

      payload = { subjectType, profile: subject.toJSON(), courses, assignments, liveSessions };
    }

    await DataSubjectRequest.create({
      subject_type: subjectType,
      subject_uuid: uuid,
      request_type: 'export',
      performed_by_admin_id: req.admin.id,
      institution_id: req.admin.institution_id || subject.institution_id || null,
      reason: null
    });

    res.setHeader('Content-Disposition', `attachment; filename="${subjectType}-${uuid}-export.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('GDPR export error:', err);
    return next(new ErrorHandler('Failed to export subject data', 500));
  }
};
```

Save as `controllers/AdminController/gdprController.js`.

- [ ] **Step 2: Create the routes file**

```js
const express = require('express');
const router = express.Router();

const gdprController = require('../../controllers/AdminController/gdprController');
const { adminAuth, requireRole } = require('../../utils/AdminAuth');

router.use(adminAuth, requireRole(['super_admin', 'institution_admin']));

router.get('/search', gdprController.searchSubject);
router.get('/:subjectType/:uuid/export', gdprController.exportSubject);

module.exports = router;
```

Save as `routes/AdminRoutes/gdprRoutes.js`. (`/requests` and the `anonymize` POST route are added in Tasks 3-4.)

- [ ] **Step 3: Mount the routes**

In `routes/AdminRoutes/adminRoutes.js`, immediately after:

```js
// Admissions & Enrollments routes
const admissionsRoutes = require('./admissionsRoutes');
router.use('/admissions', admissionsRoutes);
```

add:

```js

// GDPR data-subject-rights routes (admin-mediated export / anonymize)
const gdprRoutes = require('./gdprRoutes');
router.use('/gdpr', gdprRoutes);
```

- [ ] **Step 4: Verify**

Run: `node -e "require('./routes/AdminRoutes/adminRoutes')"`
Expected: no thrown error (confirms `gdprController`/`gdprRoutes` load and export the expected handlers).

- [ ] **Step 5: Commit**

```bash
git add controllers/AdminController/gdprController.js routes/AdminRoutes/gdprRoutes.js routes/AdminRoutes/adminRoutes.js
git commit -m "feat: add GDPR search and export endpoints"
```

---

### Task 3: GDPR anonymize endpoint

**Files:**
- Modify: `Viewebit-backend/controllers/AdminController/gdprController.js`
- Modify: `Viewebit-backend/routes/AdminRoutes/gdprRoutes.js`

**Interfaces:**
- Consumes: `bcryptjs`, `crypto` (Node builtin), `sequelize` from `../../models` (add to the existing destructured import).
- Produces: `gdprController.anonymizeSubject` — consumed by Task 5 (Admin Panel "Anonymize / Erase" action).

- [ ] **Step 1: Add `sequelize` to the existing import and add the handler**

In `controllers/AdminController/gdprController.js`, change the top import from:

```js
const {
  User, Educator, TestSession, Subscription, Notification, PushToken,
  LeaderboardEntry, QuestionReport, AssignmentSubmission, LessonProgress,
  LiveSessionAttendance, Certificate, Course, Assignment, LiveSession,
  DataSubjectRequest
} = require('../../models');
```

to:

```js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  User, Educator, TestSession, Subscription, Notification, PushToken,
  LeaderboardEntry, QuestionReport, AssignmentSubmission, LessonProgress,
  LiveSessionAttendance, Certificate, Course, Assignment, LiveSession,
  DataSubjectRequest, sequelize
} = require('../../models');
```

Then append at the end of the file:

```js

exports.anonymizeSubject = async (req, res, next) => {
  let transaction;
  try {
    const { subjectType, uuid } = req.params;
    const { reason } = req.body;

    if (!assertValidSubjectType(subjectType, next)) return;
    if (!reason || !reason.trim()) {
      return next(new ErrorHandler('A reason is required to anonymize a record', 400));
    }

    const Model = subjectType === 'student' ? User : Educator;
    const idField = subjectType === 'student' ? 'uuid' : 'id';
    const subject = await Model.findOne({ where: { [idField]: uuid } });
    if (!subject) return next(new ErrorHandler('No matching record found', 404));
    if (!assertInstitutionScope(req, subject, next)) return;
    if (subject.is_anonymized) {
      return next(new ErrorHandler('This record has already been anonymized', 400));
    }

    const shortId = uuid.slice(0, 8);
    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    transaction = await sequelize.transaction();

    if (subjectType === 'student') {
      await subject.update({
        username: `deleted_${shortId}`,
        email: `deleted-${shortId}@anonymized.viewebit.local`,
        password: randomPassword,
        fullName: 'Deleted User',
        phone: null,
        phoneNumber: null,
        dateOfBirth: null,
        schoolName: null,
        city: null,
        state: null,
        profileImage: null,
        avatarUrl: null,
        otp: null,
        otpExpiry: null,
        current_session_id: null,
        device_id: null,
        isActive: false,
        is_anonymized: true,
        anonymized_at: new Date()
      }, { transaction });
    } else {
      await subject.update({
        email: `deleted-${shortId}@anonymized.viewebit.local`,
        password: randomPassword,
        name: 'Deleted Educator',
        avatar: null,
        bio: null,
        designation: null,
        employee_code: null,
        otp: null,
        otpExpiry: null,
        reset_otp: null,
        reset_otp_expiry: null,
        reset_token: null,
        reset_token_expiry: null,
        current_session_id: null,
        isActive: false,
        is_anonymized: true,
        anonymized_at: new Date()
      }, { transaction });
    }

    await DataSubjectRequest.create({
      subject_type: subjectType,
      subject_uuid: uuid,
      request_type: 'anonymize',
      performed_by_admin_id: req.admin.id,
      institution_id: req.admin.institution_id || subject.institution_id || null,
      reason: reason.trim()
    }, { transaction });

    await transaction.commit();

    res.status(200).json({ success: true, message: 'Record anonymized successfully' });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('GDPR anonymize error:', err);
    return next(new ErrorHandler('Failed to anonymize record', 500));
  }
};
```

- [ ] **Step 2: Wire the route**

In `routes/AdminRoutes/gdprRoutes.js`, add after the `search`/`export` routes:

```js
router.post('/:subjectType/:uuid/anonymize', gdprController.anonymizeSubject);
```

- [ ] **Step 3: Verify**

Run: `node -e "require('./models'); require('./routes/AdminRoutes/adminRoutes')"`
Expected: no thrown error.

Read through the new handler once more end-to-end: confirm every branch that can fail before the transaction starts returns early (missing reason, not found, wrong institution, already anonymized), and that both `User` and `Educator` update blocks only ever run after `transaction = await sequelize.transaction()`.

- [ ] **Step 4: Commit**

```bash
git add controllers/AdminController/gdprController.js routes/AdminRoutes/gdprRoutes.js
git commit -m "feat: add GDPR anonymize endpoint with audit logging"
```

---

### Task 4: GDPR audit log listing endpoint

**Files:**
- Modify: `Viewebit-backend/controllers/AdminController/gdprController.js`
- Modify: `Viewebit-backend/routes/AdminRoutes/gdprRoutes.js`

**Interfaces:**
- Produces: `gdprController.listRequests` — consumed by Task 5 (Admin Panel "Recent Requests" table). Response shape: `{ success: true, data: DataSubjectRequestRow[], pagination: { page, limit, total, totalPages } }`.

- [ ] **Step 1: Add the handler**

Append to `controllers/AdminController/gdprController.js`:

```js

exports.listRequests = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const where = {};
    if (req.admin.role === 'institution_admin') {
      where.institution_id = req.admin.institution_id;
    }

    const { count, rows } = await DataSubjectRequest.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 }
    });
  } catch (err) {
    console.error('GDPR list requests error:', err);
    return next(new ErrorHandler('Failed to load data subject requests', 500));
  }
};
```

- [ ] **Step 2: Wire the route**

In `routes/AdminRoutes/gdprRoutes.js`, add alongside the other routes:

```js
router.get('/requests', gdprController.listRequests);
```

The full file should now read, in order: `router.use(adminAuth, requireRole(...))`, then `GET /search`, `GET /requests`, `GET /:subjectType/:uuid/export`, `POST /:subjectType/:uuid/anonymize`.

- [ ] **Step 3: Verify**

Run: `node -e "require('./models'); require('./routes/AdminRoutes/adminRoutes')"`
Expected: no thrown error.

- [ ] **Step 4: Commit**

```bash
git add controllers/AdminController/gdprController.js routes/AdminRoutes/gdprRoutes.js
git commit -m "feat: add GDPR audit log listing endpoint"
```

---

### Task 5: Admin Panel — Privacy & Data Requests page

**Files:**
- Create: `Viewebit-AdminPanel/src/services/gdpr.ts`
- Create: `Viewebit-AdminPanel/src/pages/privacy/DataSubjectRequestsPage.tsx`
- Modify: `Viewebit-AdminPanel/src/components/layout/Sidebar.tsx`
- Modify: `Viewebit-AdminPanel/src/App.tsx`

**Interfaces:**
- Consumes: `GET /admin/gdpr/search`, `GET /admin/gdpr/:subjectType/:uuid/export`, `POST /admin/gdpr/:subjectType/:uuid/anonymize`, `GET /admin/gdpr/requests` (Tasks 2-4).

- [ ] **Step 1: Create the service**

```ts
import api from './api';

export type GdprSubjectType = 'student' | 'educator';

export interface GdprSubjectSummary {
  subjectType: GdprSubjectType;
  uuid: string;
  name: string;
  email: string;
  institution_id: number | null;
  is_anonymized: boolean;
}

export interface DataSubjectRequestRecord {
  id: number;
  subject_type: GdprSubjectType;
  subject_uuid: string;
  request_type: 'export' | 'anonymize';
  performed_by_admin_id: string;
  institution_id: number | null;
  reason: string | null;
  created_at: string;
}

export const gdprService = {
  search: async (query: string, subjectType: GdprSubjectType): Promise<{ success: boolean; data: GdprSubjectSummary }> => {
    const response = await api.get('/admin/gdpr/search', { params: { query, subjectType } });
    return response.data;
  },

  exportSubject: async (subjectType: GdprSubjectType, uuid: string): Promise<Blob> => {
    try {
      const response = await api.get(`/admin/gdpr/${subjectType}/${uuid}/export`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      // With responseType: 'blob', axios delivers even a JSON error body as an
      // opaque Blob — parse it back to JSON so callers can read
      // error.response.data.message like they do for every other request.
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          error.response.data = JSON.parse(text);
        } catch {
          // Not JSON — leave error.response.data as the raw Blob.
        }
      }
      throw error;
    }
  },

  anonymizeSubject: async (subjectType: GdprSubjectType, uuid: string, reason: string) => {
    const response = await api.post(`/admin/gdpr/${subjectType}/${uuid}/anonymize`, { reason });
    return response.data;
  },

  listRequests: async (
    page = 1,
    limit = 20
  ): Promise<{ success: boolean; data: DataSubjectRequestRecord[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
    const response = await api.get('/admin/gdpr/requests', { params: { page, limit } });
    return response.data;
  },
};
```

Save as `src/services/gdpr.ts`.

- [ ] **Step 2: Create the page**

```tsx
import React, { useState, useEffect } from 'react';
import { Search, Download, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { gdprService, GdprSubjectSummary, GdprSubjectType, DataSubjectRequestRecord } from '../../services/gdpr';

interface AnonymizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: GdprSubjectSummary | null;
  onSuccess: () => void;
}

const AnonymizeModal: React.FC<AnonymizeModalProps> = ({ isOpen, onClose, subject, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !reason.trim()) return;
    setLoading(true);
    try {
      await gdprService.anonymizeSubject(subject.subjectType, subject.uuid, reason.trim());
      toast.success('Record anonymized');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to anonymize record');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !subject) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Anonymize {subject.name}</h2>
        <p className="text-sm text-gray-600 mb-6">
          This permanently scrubs this {subject.subjectType}'s personal information (name, email, phone, etc.)
          and blocks login. Financial/payment records are kept intact. This cannot be undone.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for this request
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="e.g. Data subject requested erasure via support ticket #1234"
              autoFocus
              required
            />
          </div>
          <div className="border-t pt-4 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50" disabled={loading || !reason.trim()}>
              {loading ? 'Anonymizing...' : 'Anonymize'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DataSubjectRequestsPage: React.FC = () => {
  const [subjectType, setSubjectType] = useState<GdprSubjectType>('student');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<GdprSubjectSummary | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [requests, setRequests] = useState<DataSubjectRequestRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [requestsLoading, setRequestsLoading] = useState(true);

  const loadRequests = async (targetPage: number) => {
    setRequestsLoading(true);
    try {
      const response = await gdprService.listRequests(targetPage, 20);
      setRequests(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setPage(targetPage);
    } catch (error) {
      toast.error('Failed to load recent requests');
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(1);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      const response = await gdprService.search(query.trim(), subjectType);
      setResult(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No matching record found');
    } finally {
      setSearching(false);
    }
  };

  const handleExport = async () => {
    if (!result) return;
    try {
      const blob = await gdprService.exportSubject(result.subjectType, result.uuid);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.subjectType}-${result.uuid}-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
      loadRequests(1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to export data');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy & Data Requests</h1>
        <p className="text-gray-600">Fulfill GDPR data access and erasure requests for students and educators</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <select
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value as GdprSubjectType)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="student">Student</option>
            <option value="educator">Educator</option>
          </select>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Email or UUID"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {result && (
          <div className="mt-6 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{result.name}</h3>
              <p className="text-sm text-gray-600">{result.email}</p>
              {result.is_anonymized && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  <ShieldAlert className="h-3 w-3" /> Already anonymized
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 border border-primary-200 rounded-md hover:bg-primary-50"
              >
                <Download className="h-4 w-4" /> Export Data
              </button>
              <button
                onClick={() => setModalOpen(true)}
                disabled={result.is_anonymized}
                className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
              >
                Anonymize / Erase
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
        </div>
        {requestsLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No requests logged yet</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900">{r.request_type === 'export' ? 'Export' : 'Anonymize'}</span>
                  <span className="text-gray-500"> · {r.subject_type} · {r.subject_uuid.slice(0, 8)}</span>
                  {r.reason && <p className="text-gray-500 mt-1">{r.reason}</p>}
                </div>
                <span className="text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
        <div className="p-4 flex justify-end gap-2 border-t border-gray-200">
          <button
            onClick={() => loadRequests(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => loadRequests(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <AnonymizeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        subject={result}
        onSuccess={() => {
          if (result) setResult({ ...result, is_anonymized: true });
          loadRequests(1);
        }}
      />
    </div>
  );
};

export default DataSubjectRequestsPage;
```

Save as `src/pages/privacy/DataSubjectRequestsPage.tsx`.

- [ ] **Step 3: Add the sidebar item**

In `src/components/layout/Sidebar.tsx`, add the `Lock` icon to the existing `lucide-react` import:

```tsx
import {
  Activity,
  BookOpen,
  Building2,
  CreditCard,
  FileText,
  Flag,
  Home,
  Lock,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  GraduationCap,
  TrendingUp
} from 'lucide-react';
```

Then add a nav entry to the `navigation` array, immediately after `Reports`:

```tsx
  { name: 'Reports', href: '/reports', icon: Flag },
  { name: 'Privacy & Data Requests', href: '/privacy-requests', icon: Lock },
```

(This repo's sidebar shows every item to every authenticated admin regardless of role — role restriction is enforced by the backend, matching the existing pattern for every other role-gated page such as "Roles & Permissions".)

- [ ] **Step 4: Add the route**

In `src/App.tsx`, add the import alongside the other page imports:

```tsx
import DataSubjectRequestsPage from './pages/privacy/DataSubjectRequestsPage';
```

Then, immediately after the existing:

```tsx
        <Route path="revenue" element={
          <ProtectedRoute>
            <RevenuePage />
          </ProtectedRoute>
        } />
```

add:

```tsx
        <Route path="privacy-requests" element={
          <ProtectedRoute>
            <DataSubjectRequestsPage />
          </ProtectedRoute>
        } />
```

- [ ] **Step 5: Verify the TypeScript build**

Run: `cd Viewebit-AdminPanel && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual verification**

1. Confirm the sidebar shows "Privacy & Data Requests" and it opens the new page.
2. Search for a real seeded student by email — confirm the profile card appears.
3. Click "Export Data" — confirm a JSON file downloads and contains the profile plus related records.
4. Click "Anonymize / Erase" on a throwaway seeded student, type a reason, confirm — confirm the card updates to show "Already anonymized" and the button becomes disabled.
5. Confirm the "Recent Requests" table shows both the export and anonymize actions just performed, with the reason text visible on the anonymize row.
6. As an `institution_admin` test account, confirm searching a subject from a different institution returns a 403/toast error.

- [ ] **Step 7: Commit**

```bash
git add src/services/gdpr.ts src/pages/privacy/DataSubjectRequestsPage.tsx src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "feat: add Admin Panel Privacy & Data Requests page for GDPR export/anonymize"
```

---

### Task 6: Viewebit-web — Privacy Policy copy corrections

**Files:**
- Modify: `Viewebit-web/src/pages/PrivacySecurityPage.tsx`

**Interfaces:** None — copy-only changes to an existing page, no new props or exports.

- [ ] **Step 1: Name the real third parties in the sharing section**

Replace:

```tsx
                    <li><strong>Service Providers:</strong> Trusted third-party services that help us operate (hosting, payment processing, analytics) — under strict confidentiality agreements</li>
```

with:

```tsx
                    <li><strong>Service Providers:</strong> Razorpay processes our payments (they receive only what's needed to complete a transaction — we never share your password or profile data with them), and our email provider sends transactional emails (OTPs, receipts, notifications) — both operate under confidentiality obligations and never use your data for their own marketing</li>
```

- [ ] **Step 2: Describe the real rights-fulfillment process**

Replace:

```tsx
                <p className="text-sm text-gray-600 mt-4 italic">
                  To exercise any of these rights, please contact us at the email provided below.
                </p>
```

with:

```tsx
                <p className="text-sm text-gray-600 mt-4 italic">
                  To exercise any of these rights, contact your institution's administrator (or email us directly
                  below) — requests for data access or account erasure are verified and fulfilled through our
                  internal admin tooling, and every request is logged for audit purposes.
                </p>
```

- [ ] **Step 3: Describe the real retention/erasure mechanism**

Replace:

```tsx
                  <p>
                    We retain your personal information only as long as necessary to provide services and comply with legal obligations.
                    When you delete your account, we will remove your personal data within 30 days, except where retention is required by law.
                  </p>
```

with:

```tsx
                  <p>
                    We retain your personal information only as long as necessary to provide services and comply with legal obligations.
                    When you request account deletion, we anonymize your personal details (name, email, phone, and
                    similar identifying fields) so the account can no longer be tied to you. Payment/transaction
                    records are kept in anonymized form for approximately 7 years, as required by Indian tax and
                    accounting law — this is why we anonymize rather than fully delete records tied to a paid
                    subscription.
                  </p>
```

- [ ] **Step 4: Verify the TypeScript build**

Run: `cd Viewebit-web && npx tsc --noEmit`
Expected: no new errors (this task only changes JSX text content, no logic).

- [ ] **Step 5: Manual verification**

Open `/privacy` in the running app and visually confirm the three updated paragraphs read correctly and the page still renders without layout breakage.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PrivacySecurityPage.tsx
git commit -m "docs: correct Privacy Policy copy to name real third parties and the actual retention/erasure process"
```

---

### Task 7: Viewebit-web — Cookie consent banner

**Files:**
- Create: `Viewebit-web/src/components/CookieConsentBanner.tsx`
- Modify: `Viewebit-web/src/App.tsx`

**Interfaces:**
- Produces: `CookieConsentBanner` (default export, no props) — mounted once at the app root.

- [ ] **Step 1: Create the component**

```tsx
import React, { useEffect, useState } from 'react';

// Any future analytics/tracking script must check
// window.localStorage.getItem('viewebit_cookie_consent') === 'accepted'
// before loading — this is the hook that makes that check possible.
const STORAGE_KEY = 'viewebit_cookie_consent';

const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const handleChoice = (choice: 'accepted' | 'rejected') => {
    window.localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 text-white px-4 py-4 sm:px-6 shadow-2xl">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-gray-200 flex-1">
          We use cookies to keep you signed in and remember your preferences. See our{' '}
          <a href="/privacy" className="underline hover:text-white">Privacy Policy</a> for details.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => handleChoice('rejected')}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-600 hover:bg-gray-800"
          >
            Reject
          </button>
          <button
            onClick={() => handleChoice('accepted')}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary-600 hover:bg-primary-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
```

Save as `src/components/CookieConsentBanner.tsx`.

- [ ] **Step 2: Mount it in `App.tsx`**

Add the import alongside the other top-level imports:

```tsx
import CookieConsentBanner from './components/CookieConsentBanner';
```

Then, in the `AppContent` component's JSX, add it right after the `<Toaster ... />` element (still inside `<Router>`, so it renders on every route):

```tsx
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#22c55e',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        <CookieConsentBanner />
      </Router>
```

- [ ] **Step 3: Verify the TypeScript build**

Run: `cd Viewebit-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

1. Clear `localStorage` and load the site — confirm the banner appears at the bottom.
2. Click "Accept" — confirm the banner disappears and `localStorage.viewebit_cookie_consent === 'accepted'`.
3. Reload the page — confirm the banner does not reappear.
4. Clear `localStorage` again, click "Reject" this time — confirm the banner disappears and the stored value is `'rejected'`.
5. Confirm the banner does not overlap or break any existing footer/CTA content on the homepage.

- [ ] **Step 5: Commit**

```bash
git add src/components/CookieConsentBanner.tsx src/App.tsx
git commit -m "feat: add cookie consent banner"
```
