# GDPR Data Subject Rights: Admin-Mediated Export & Anonymization

## Problem

A customer/procurement ask requires Viewebit to demonstrate real GDPR
compliance, not just a claim. Today `Viewebit-web` has a `PrivacySecurityPage`
with generic legal-style copy, but:

- There is no mechanism anywhere in the system to export a user's personal
  data (the GDPR "right to access") or to erase it (the "right to erasure").
- There is no cookie-consent mechanism on the marketing site.
- The Privacy Policy copy makes claims ("we never share your data with third
  parties") without naming the actual third parties involved (Razorpay for
  payments, the transactional email provider) or stating real retention
  periods.

This spec covers building the actual data-subject-rights (DSR) tooling and
correcting the policy/consent gaps. It does not cover SCORM (tracked
separately).

## Scope

Three repos: `Viewebit-backend`, `Viewebit-AdminPanel`, `Viewebit-web`. No
changes to `Viewebit-EducatorPanel` — DSR requests are handled by admin staff,
not self-service, so educators never need to act on their own or a student's
request from within the Educator Panel.

Data subjects covered: **students** (`User` model) and **educators**
(`Educator` model). Admin accounts themselves are out of scope for this round
— they're Viewebit's own staff/institution staff, not the subjects a
procurement questionnaire is asking about.

## Decisions

1. **Admin-mediated, not self-service.** A student or educator who wants their
   data exported or erased contacts their institution; a `super_admin` or
   `institution_admin` fulfills the request through a new Admin Panel tool.
   This keeps the engineering scope to one admin-facing surface instead of
   building and securing self-service flows in both `Viewebit-web` and a
   student-facing surface that doesn't otherwise exist yet.
2. **Anonymize, don't hard-delete.** Erasure scrubs personally-identifying
   fields (name, email, phone, DOB, profile image, password) from the
   subject's row and sets an `is_anonymized` flag, but the row and everything
   that references it (subscriptions/payments, test sessions, certificates,
   etc.) stays in place under the same (now-anonymized) id. This satisfies
   GDPR erasure while not conflicting with tax/accounting retention law
   (financial records must typically be kept ~7 years in India) — hard-
   deleting the row would either violate that law or require peeling
   financial records off into a disconnected shadow table, which is more
   complex for no real benefit over anonymization.
3. **Audit trail is mandatory.** Every export or anonymize action is logged
   (who did it, when, for whom, why) in a new `data_subject_requests` table.
   This is the artifact a procurement/security reviewer actually wants to see
   — "we have a documented, auditable process" is the compliance claim being
   made real.
4. **Cookie consent banner ships as part of this round.** `Viewebit-web` runs
   no analytics/tracking scripts today, so there is nothing to gate yet, but
   the banner itself (and a documented rule that any future tracking script
   must check the stored consent choice before loading) is a standard item on
   compliance/security questionnaires and is cheap to add now.

## Data model changes (`Viewebit-backend`)

New columns, both nullable/defaulted (idempotent additive migrations):

```
users:      is_anonymized BOOLEAN NOT NULL DEFAULT false
            anonymized_at DATETIME NULL

educators:  is_anonymized BOOLEAN NOT NULL DEFAULT false
            anonymized_at DATETIME NULL
```

New table `data_subject_requests`:

```
id                BIGINT AUTO_INCREMENT PRIMARY KEY
subject_type      ENUM('student','educator') NOT NULL
subject_uuid      CHAR(36) NOT NULL
request_type      ENUM('export','anonymize') NOT NULL
performed_by_admin_id  CHAR(36) NOT NULL   -- references admins.id, no FK
                                            -- constraint (matches this
                                            -- codebase's existing pattern of
                                            -- not FK-constraining admin
                                            -- audit/actor columns)
institution_id    INT NULL                 -- the institution context the
                                            -- admin was scoped to at request
                                            -- time, for later audit filtering
reason            TEXT NULL                -- required by the API for
                                            -- anonymize, optional for export
created_at        DATETIME NOT NULL
```

No `updated_at` — these rows are an append-only audit log and are never
edited.

## Backend: `/admin/gdpr/*`

New `controllers/AdminController/gdprController.js` and
`routes/AdminRoutes/gdprRoutes.js`, mounted at `/admin/gdpr`, every route
behind `adminAuth` + `requireRole(['super_admin', 'institution_admin'])`
(matching the existing convention in `educatorManagementRoutes.js`).
`institution_admin` requests are additionally scoped: the target subject's
`institution_id` must match `req.admin.institution_id`, or the request is
rejected with 403. `super_admin` is unrestricted (its `institution_id` is
typically `NULL`, consistent with the existing pattern noted in the
Institution Pricing Modes work).

### `GET /admin/gdpr/search?query=&subjectType=`

Looks up a single student or educator by exact email or uuid. Returns a
compact profile summary (name, email, uuid, institution, `is_anonymized`) for
the Admin Panel to display before the admin picks an action. 404 if no match.

### `GET /admin/gdpr/:subjectType/:uuid/export`

Gathers every row referencing the subject's uuid into one JSON payload and
returns it as a file download (`Content-Disposition: attachment`):

- **Student (`User`):** core profile fields, `TestSession` rows, `Subscription`
  rows, `Notification` rows, `PushToken` rows, `LeaderboardEntry` rows,
  `QuestionReport` rows (both submitted and reviewed-by, if any),
  `AssignmentSubmission` rows, `LessonProgress` rows,
  `LiveSessionAttendance` rows, `Certificate` rows.
- **Educator:** core profile fields, `Course` rows (title/status only, not
  full content — the course content itself isn't the educator's personal
  data), `Assignment` rows, `LiveSession` rows.

Logs a `data_subject_requests` row with `request_type: 'export'` after a
successful export. If the subject is already anonymized, export still
succeeds (returns the anonymized state) — an admin may legitimately need to
confirm what data now exists post-anonymization.

### `POST /admin/gdpr/:subjectType/:uuid/anonymize`

Body: `{ reason: string }` — 400 if `reason` is missing or blank. 400 if the
subject is already `is_anonymized`. Runs in a `sequelize.transaction()`:

**User fields scrubbed:**
```
username        -> `deleted_${uuid.slice(0, 8)}`
email           -> `deleted-${uuid.slice(0, 8)}@anonymized.viewebit.local`
password        -> crypto.randomBytes(32).toString('hex') (bcrypt-hashed,
                    same as normal password storage — makes the account
                    permanently unable to authenticate)
fullName        -> 'Deleted User'
phone, phoneNumber, dateOfBirth, schoolName, city, state,
profileImage, avatarUrl, otp, otpExpiry,
current_session_id, device_id           -> null
isActive        -> false
is_anonymized   -> true
anonymized_at   -> now
```

**Educator fields scrubbed:**
```
email           -> `deleted-${id.slice(0, 8)}@anonymized.viewebit.local`
password        -> crypto.randomBytes(32).toString('hex'), bcrypt-hashed
name            -> 'Deleted Educator'   -- kept non-null: still displayed as
                                          the author on courses students
                                          already purchased/enrolled in;
                                          this is the standard "erasure vs.
                                          contract necessity" carve-out
avatar, bio, designation, employee_code, otp, otpExpiry,
reset_otp, reset_otp_expiry, reset_token, reset_token_expiry,
current_session_id                      -> null
isActive        -> false
is_anonymized   -> true
anonymized_at   -> now
```

**Explicitly untouched:** `Subscription`/payment rows, `Course` content,
`TestSession`/answer history, `Certificate` rows — these stay linked to the
now-anonymized uuid. This is what makes the design satisfy both erasure and
financial-retention law at once (per Decision 2).

Logs a `data_subject_requests` row with `request_type: 'anonymize'` and the
provided `reason`. If any step fails, the transaction rolls back and nothing
is scrubbed.

## Admin Panel

New page `src/pages/privacy/DataSubjectRequestsPage.tsx`, new sidebar item
"Privacy & Data Requests" (visible to `super_admin`/`institution_admin` only,
same visibility pattern as other role-gated sidebar items).

- A search box (email or uuid, with a student/educator toggle) calling
  `GET /admin/gdpr/search`.
- On a match: a profile card (name, email, institution, `is_anonymized`
  state) with two actions:
  - **Export Data** — calls the export endpoint, triggers a browser download
    of the returned JSON.
  - **Anonymize / Erase** — opens a confirmation modal requiring the admin to
    type a reason (mirrors the "type to confirm" pattern already used
    elsewhere in this panel for destructive actions); on confirm, calls the
    anonymize endpoint and refreshes the profile card to show the scrubbed
    state.
- Below the search/action area: a "Recent Requests" table reading a new
  `GET /admin/gdpr/requests` (paginated, newest first) listing
  `subject_type`, masked/anonymized-safe subject reference, `request_type`,
  `performed_by`, `reason`, `created_at` — the audit visibility that makes
  Decision 3 real inside the product, not just in the database.

## Viewebit-web

**`PrivacySecurityPage.tsx` rewrite** — replace the generic copy with
concrete statements: what personal data is collected (account/profile fields,
usage/progress data, payment metadata), the legal basis (contract
performance for account data, legitimate interest for security/fraud
prevention), named third parties (Razorpay for payment processing, the
transactional email provider), retention periods (account data until an
erasure request is fulfilled; payment records retained ~7 years per
accounting law), and how to exercise access/erasure rights (contact your
institution administrator, who can fulfill the request through Viewebit's
admin tooling).

**New `CookieConsentBanner.tsx`** — a bottom banner shown on first visit
(persisted via `localStorage.viewebit_cookie_consent`, values `'accepted'` /
`'rejected'`), mounted once in the root layout so it appears across the whole
site. No cookies are actually gated behind it today (no analytics scripts
exist), but the component and the stored flag are the hook any future
tracking script must check before loading — documented as a one-line comment
at the top of the component.

## Out of scope

Automatic data-retention purge jobs, a formal DPA template for subprocessors,
self-service export/erasure for students/educators, and admin-account DSR
handling. These are reasonable future follow-ups, not required to answer the
current procurement ask.

## Verification

`Viewebit-backend` has no automated test framework (`npm test` is a stub), so
verification is source-level plus manual:

1. `node -e "require('./models')"` after the migrations/model changes — no
   load errors.
2. Read each new/changed migration's `up()`/`down()` end-to-end to confirm
   additive idempotency and clean reversal.
3. Manual pass against a seeded throwaway student and educator: run export,
   inspect the returned JSON for completeness; run anonymize, confirm the
   scrubbed fields, confirm login now fails for that account, confirm
   `Subscription`/payment rows for that account are unchanged and still
   resolve (just to an anonymized identity).
4. Admin Panel: confirm the sidebar item is hidden for non-`super_admin`/
   `institution_admin` roles, and that an `institution_admin` cannot search up
   a subject outside their own institution (403).
