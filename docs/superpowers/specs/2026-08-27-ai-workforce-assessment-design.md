# AI Workforce Skills Assessment

Date: 2026-08-27
Repos touched: `Viewebit-backend`, `Viewebit-web`, `Viewebit-AdminPanel`
Branch: `new-features` (all three repos, per standing project convention — flag if this
feature should instead ship on `main` since it isn't LMS-domain work)

## Problem

Viewebit wants a lead-generation / diagnostic tool for UK recruitment agencies: a
5–7 minute "AI Workforce Skills Assessment" that scores an agency's AI readiness
across five dimensions, surfaces top AI opportunities and skill gaps, captures the
respondent as a lead, and stores everything for follow-up and future CRM export —
entirely separate from LMS data (no shared tables, no shared user accounts).

Full content brief (question wording, scoring philosophy, results-page copy, UK
English requirements) was supplied by the user in chat and is treated as the source
of truth for tone/wording; this spec is the technical shape around it.

## Architecture recap (already approved)

- **Backend owns the question schema and all scoring.** Frontend fetches
  `GET /api/assessment/questions` and renders generically — editing questions later
  means editing one backend file, not redeploying any frontend.
- **Backend computes the result**, not the browser (`POST /api/assessment/submit`
  takes raw answers, returns the finished report). Can't be gamed client-side, and
  the same engine will drive PDF/CRM output later.
- **New, isolated data**: one table (`assessment_leads`), no foreign keys into
  `users`/`admins` LMS tables other than an optional nullable `contacted_by → admins`
  (same non-constrained pattern `ContactQuery.viewed_by` already uses).
- **AdminPanel gets a new screen** ("Assessment Leads"), mirroring the existing
  `QueriesPage.tsx` / `QueryDetailModal.tsx` / `services/queries.ts` trio exactly.
- **Auto-email** the results to the lead via the existing `utils/verifyEmail.js`
  `sendMail()`. No PDF generation service and no CRM integration in this pass — the
  data model is shaped so both are additive later.

## Question schema

30 questions total (within the "~25–30" brief), landing at the 5–7 minute target
because most are single-tap/single-click. Three sections (AI Confidence, Workflow
Frequency, Workforce Readiness) render as a **matrix screen** — several same-shaped
rows (all 1–5 scales, or all frequency scales) on one screen, since answering ten
1–5 sliders is materially faster than ten full-screen transitions, while still
reading as "one question" to the user. The progress counter counts every row (so
"Question 7 of 30" still means something), advancing by the row-count when a matrix
screen's Continue is pressed.

Section 3's brief list (16 illustrative workflow tasks) is trimmed to the 4 with the
highest signal density for opportunity-mapping — each one pairs directly with a
Section 4 use-case checklist item and a Section 5 scenario, so nothing downstream
loses coverage. Flagging this trim explicitly since it's the one place this spec
diverges from the literal brief list.

Every question carries a stable `id` (used as the key in the `answers` JSON blob),
a `section`, a `type`, and — invisibly to the frontend — a scoring mapping.

### Section 1 — About the Agency (3, single-select, context only)

| id | prompt | options | scoring |
|---|---|---|---|
| `agency_type` | What type of recruitment business are you? | Generalist / Specialist / Executive search / IT-Tech / Healthcare / Engineering / Finance-Accounting / Other | stored only, no score |
| `team_size` | Approximately how large is your recruitment team? | 1–5 / 6–15 / 16–30 / 31–75 / 76–150 / 150+ | stored only, no score |
| `ai_approach` | Which best describes your current approach to AI? | Not using AI yet(0) / A few individuals independently(25) / Started introducing tools(50) / Used across several workflows(75) / Becoming part of operating model(100) | → **Organisational AI Readiness**, weight 1 |

### Section 2 — AI Confidence (matrix, 10 rows, 1–5 scale → normalised 0/25/50/75/100)

| id | row label | dimension |
|---|---|---|
| `conf_prompting` | Writing effective AI prompts | Prompting & AI Communication |
| `conf_research` | Using AI to research candidates | Recruitment Workflow Application |
| `conf_jd` | Using AI to improve job descriptions | Prompting & AI Communication |
| `conf_personalise` | Using AI to personalise candidate communication | Prompting & AI Communication |
| `conf_summarise` | Using AI to summarise CVs or profiles | Recruitment Workflow Application |
| `conf_interview` | Using AI to prepare interview questions | Recruitment Workflow Application |
| `conf_analyse` | Using AI to analyse recruitment data | AI Fluency |
| `conf_verify` | Checking AI-generated information | Responsible AI & Human Oversight |
| `conf_confidentiality` | Protecting confidential candidate/client information when using AI | Responsible AI & Human Oversight |
| `conf_when_not` | Identifying when AI should NOT be used | Responsible AI & Human Oversight |

### Section 3 — Recruitment Workflow (matrix, 4 rows, trimmed; Never/Rarely/Sometimes/Often/Very Often → 0/25/50/75/100)

`freq_sourcing` (Candidate sourcing), `freq_screening` (CV screening), `freq_outreach`
(Candidate outreach), `freq_reporting` (Reporting & admin). Feeds the **opportunity
engine only** (see below) — not a dimension score directly.

### Section 4 — AI Use-Case Maturity (2)

| id | prompt | type | scoring |
|---|---|---|---|
| `use_cases` | Which of these are your recruiters currently using AI for? | multi-select (Writing emails, Writing JDs, Candidate research, CV summarisation, Candidate matching, Interview prep, Market research, Data analysis, CRM/admin support, Content creation, Meeting summaries, None of these) | feeds opportunity engine only |
| `effectiveness` | How confident are you that your team is using AI effectively rather than simply using it occasionally? | 1–5 scale | → **AI Fluency**, weight 1 |

### Section 5 — Practical Scenarios (5, single-select A–D)

Each option carries a maturity point value (0–100); the "correct" option is never
labelled as correct on screen. Each scenario feeds two dimensions at a split weight.

| id | scenario | favoured option | dimensions (weight) |
|---|---|---|---|
| `scn_screening` | 80 CVs for a hard-to-fill role — what would your team most likely do? | B: AI-assisted shortlist, recruiter validates (100) · A: manual review of all (45) · C: AI auto-selects (20) · D: no process (10) | Workflow Application (0.7) / Responsible AI (0.3) |
| `scn_outreach` | Personalised outreach to 30 candidates — best use of AI? | B: AI drafts personalised messages, reviewed before send (100) · A: identical AI message to all (35) · D: fully manual (50) · C: AI contacts without review (15) | Prompting (0.6) / Workflow Application (0.4) |
| `scn_verify` | Team uses AI to summarise candidates — most important control? | B: recruiter verifies key facts before use (100) · A: trust if it sounds professional (15) · C: avoid AI completely (40) · D: ask AI to check itself (25) | Responsible AI (1.0) |
| `scn_client` | A client wants a same-day shortlist update — how do you use AI well here? | B: AI drafts the update from real data, recruiter checks accuracy and tone before sending (100) · A: AI update sent as-is (30) · C: written entirely from memory, no AI (45) · D: no standard way of doing this (10) | Prompting (0.5) / Workflow Application (0.5) |
| `scn_confidential` | A recruiter wants to paste a client's confidential job spec into a public AI tool to speed up drafting — what should happen? | B: use an approved/secure AI tool per policy, or strip identifying details first (100) · A: paste it in, it's just a job spec (10) · C: never use AI near client data (40) · D: no policy exists either way (20) | Responsible AI (1.0) |

### Section 6 — Workforce Readiness (matrix, 6 rows, 1–5 scale → normalised)

| id | row label | dimension |
|---|---|---|
| `ready_leadership` | Does leadership actively encourage responsible AI experimentation? | Organisational AI Readiness |
| `ready_process` | Are recruitment workflows documented well enough to identify where AI could help? | Organisational AI Readiness |
| `ready_skills` | Do recruiters know how to use AI effectively? | AI Fluency |
| `ready_governance` | Does the agency have guidelines for responsible AI use? | Responsible AI & Human Oversight |
| `ready_measurement` | Does the agency measure whether AI actually saves time or improves outcomes? | Organisational AI Readiness |
| `ready_adoption` | Is AI use consistent across the team, or dependent on a few individuals? | Organisational AI Readiness |

## Scoring engine (`services/assessmentScoringEngine.js`)

Pure function, no Express/Sequelize imports — takes the answers object, returns the
full result. Unit-testable in isolation; this is the one file to change if the
scoring model evolves.

```js
computeAssessmentResult(answers) => {
  overallScore,          // 0-100 integer
  maturityLevel,          // 'ai_explorer' | 'early_adopter' | 'developing' | 'ai_ready' | 'ai_enabled'
  dimensionScores: {      // each 0-100
    aiFluency, workflowApplication, prompting, responsibleAI, organisationalReadiness
  },
  topOpportunities: [ { key, title, explanation } ],   // up to 3
  topGaps: [ { key, title, explanation } ],             // 2-4
  recommendedPriorities: [ string ]                     // same items as topGaps, phrased as priorities
}
```

**Dimension scores**: each dimension = the plain average of every mapped signal's
normalised 0–100 value (confidence/readiness rows use `(value-1)/4*100`; the
`ai_approach` and `effectiveness` items are already 0–100 or converted the same way;
scenario contributions add their weighted point value into each of their two mapped
dimensions before averaging). `responsibleAI` additionally tracks two named
sub-scores under the hood — `verificationSubscore` (from `conf_verify` +
`scn_verify` + `scn_confidential`) and `governanceSubscore` (from
`conf_confidentiality` + `ready_governance`) — used only to pick which gap label to
show, not exposed as a 6th dimension.

**Overall score**: plain average of the 5 dimension scores, rounded to the nearest
integer.

**Maturity level**: banded from `overallScore` exactly per the brief (0–20 / 21–40 /
41–60 / 61–80 / 81–100).

**Opportunity engine**: for each Section-3/4 task pair (sourcing↔research+matching,
screening↔CV-summarisation+candidate-matching, outreach↔writing-emails+content-
creation, reporting↔data-analysis+CRM-admin-support), flag the task as an
opportunity when its Section 3 frequency score is ≥50 (Sometimes or more) **and**
none of its paired Section 4 checklist items were selected. Rank flagged tasks by
frequency score descending; take the top 3. If fewer than 3 qualify, backfill with
the next-highest-frequency tasks regardless of checklist status, so there are always
3. Each opportunity key maps to one of the fixed title + explanation templates from
the brief (e.g. "Candidate Research").

**Gap engine**: rank the 5 dimension scores ascending, take those below 60, minimum
2 and maximum 4 (if all 5 score ≥60, still take the lowest 2 so the report never
reads as "no gaps" — matches the "diagnosis not criticism" framing). Each dimension
maps to one of the brief's fixed gap templates (Prompting & AI Instruction ← low
Prompting; Workflow Integration ← low Workflow Application; for Responsible AI,
choose "AI Verification" or "AI Governance" by whichever sub-score is lower, and
surface both only if both sub-scores are <60 and there's room under the 4-item cap;
Organisational Readiness maps to a general "AI Governance & Adoption" gap template
if it's the one flagged).

`recommendedPriorities` is the same ranked list's titles, so the admin/data-output
"recommended training priorities" field requires no separate algorithm.

## Backend

### Migration — `migrations/20260827000001-create-assessment-leads.js`

```
id                     INTEGER PK autoincrement
first_name             STRING(100) NOT NULL
last_name              STRING(100) NOT NULL
work_email              STRING(255) NOT NULL, validate isEmail
agency_name             STRING(255) NOT NULL
job_title                STRING(150) NOT NULL
employee_count_band       STRING(20) NOT NULL        -- lead-capture field; company-wide headcount band
                                                    -- (1-10 / 11-50 / 51-200 / 201-500 / 500+), distinct
                                                    -- from the Section 1 `team_size` recruitment-desk-size
                                                    -- answer already captured in `answers`
phone                    STRING(20) NULL
agency_type              STRING(50) NOT NULL
current_ai_approach        STRING(50) NOT NULL
answers                 JSON NOT NULL                 -- every raw {questionId: value}
overall_score             INTEGER NOT NULL
maturity_level            ENUM('ai_explorer','early_adopter','developing','ai_ready','ai_enabled') NOT NULL
dimension_scores          JSON NOT NULL
top_opportunities          JSON NOT NULL
top_gaps                 JSON NOT NULL
recommended_priorities      JSON NOT NULL
status                  ENUM('new','contacted','qualified','unqualified','closed') DEFAULT 'new'
admin_notes              TEXT NULL
contacted_at              DATE NULL
contacted_by              INTEGER NULL  -- FK admins.id, constraints:false (ContactQuery pattern)
email_sent               BOOLEAN DEFAULT false
email_sent_at              DATE NULL
ip_address               STRING(45) NULL
user_agent               TEXT NULL
completed_at              DATE NOT NULL
created_at / updated_at     DATE
```

Indexes: `work_email`, `status`, `created_at`, `agency_type` — mirrors
`ContactQuery`'s indexing choices.

### Model — `models/AssessmentLead.js`

Same shape/conventions as `models/ContactQuery.js` (`underscored: true`, validators
inline, `belongsTo(Admin, { as: 'contactedByAdmin', constraints: false })`).

### Scoring — `services/assessmentScoringEngine.js`, plus `data/assessmentQuestions.js`
holding the full schema table above as plain JS objects (sections → questions →
options/scale + the scoring metadata). The `GET /questions` response strips scoring
metadata (option point values, dimension weights) before sending — the frontend only
ever sees prompts, ids, types, and option labels.

### Controller — `controllers/AssessmentController.js`

- `getQuestions` — returns the public-shape schema.
- `submitAssessment` — validates lead fields + presence of all required answer ids,
  calls the scoring engine, `bulkInsert`-equivalent single create, fires the results
  email (try/catch, never fails the request — sets `email_sent`/`email_sent_at`),
  returns the full result object to the frontend.
- `getAllLeads`, `getLeadById`, `updateLeadStatus`, `getStats` — same
  shape as `ContactQueryController`'s admin endpoints.

### Routes — `routes/assessmentRoutes.js`, mounted at `router.use("/assessment", AssessmentRoutes)` in `routes/index.js`

- `GET /questions` — public.
- `POST /submit` — public, same 3-per-day-per-IP style rate limiter as
  `submitQueryLimiter` (spam protection on a public lead form).
- `GET/PATCH /admin/leads*`, `GET /admin/leads/stats` — `adminAuth`-gated.

### Email

New `utils/emailTemplates/assessmentResultEmail.js` builds the HTML using the result
object (score, maturity level, top 3 opportunities, top 3 gaps) plus a Viewebit-
branded footer with the "Discuss Your AI Workforce Roadmap" CTA linking to the
contact page. Sent via the existing `sendMail()` to `work_email`.

## Frontend — `Viewebit-web`

New files under `src/pages/assessment/`:

- `AssessmentIntroPage.tsx` — rendered inside `PublicLayout` (normal site chrome) at
  `/ai-workforce-assessment`. Title, subtitle, "No technical knowledge required",
  "Start Assessment" CTA.
- `AssessmentWizardPage.tsx` — standalone layout (no nav/footer, same pattern as
  `AppComingSoonPage`) at `/ai-workforce-assessment/start`. Fetches the schema once,
  drives a generic `QuestionRenderer` (switches on `type`: `single-select`,
  `multi-select`, `scale-matrix`, `frequency-matrix`), holds answers in local state,
  shows progress bar / "Question X of 30" / estimated time remaining (schema length
  × average pace so far), back/continue, and the lead-capture step inserted after
  Section 4 (before the scenarios/readiness sections, per the brief's "before
  displaying the detailed results" instruction — placed partway through rather than
  at the very end so it doesn't feel like a paywall on the results).
- `AssessmentResultsPage.tsx` — standalone layout at `/ai-workforce-assessment/results`,
  renders whatever `POST /submit` returned (score, band, 5 capability bars, top
  opportunities, top gaps, the two CTAs). "Download My Assessment Results" triggers
  the browser's print-to-PDF (`window.print()` with print-specific CSS) for v1.

New route entries added to `App.tsx`: the intro page inside the existing
`<Route element={<PublicLayout />}>` block; the wizard and results pages as their
own top-level `<Route>`s (same nesting level as `/app-coming-soon`), so neither
requires auth nor shows the app shell.

## AdminPanel — `Viewebit-AdminPanel`

- `src/services/assessments.ts` — same interface shape as `services/queries.ts`
  (`AssessmentLead`, `AssessmentListResponse`, `AssessmentStatsResponse`,
  `assessmentService.{getAllLeads, getLeadById, updateLeadStatus, getStats}`),
  hitting `/assessment/admin/leads*`.
- `src/pages/AssessmentsPage.tsx` — list + stats cards + filters, mirrors
  `QueriesPage.tsx`.
- `src/components/assessments/AssessmentDetailModal.tsx` — full respondent view:
  contact fields, 5 dimension score bars, top opportunities, top gaps, raw answers
  (collapsed/expandable JSON view), status/notes editor — mirrors
  `QueryDetailModal.tsx`.
- One new sidebar nav entry ("Assessment Leads") in whatever component renders the
  existing "Contact Queries" link.

## Testing

- Scoring engine: unit tests over `computeAssessmentResult` with hand-built answer
  sets per maturity band (all-low → `ai_explorer`, all-high → `ai_enabled`, mixed →
  verify opportunity/gap selection logic), since it's pure and isolated.
- Backend route tests: `GET /questions` shape, `POST /submit` validation (missing
  lead fields, missing answers, rate limit), admin endpoints require `adminAuth`.
- Frontend: manual pass through the wizard (keyboard nav, back/continue, matrix
  screens, mobile viewport, results rendering) — no existing frontend test harness
  in this repo to extend.

## Open assumption to confirm

Branch: per [[feedback_new_features_branch]] project convention, "LMS-expansion
work goes on `new-features`" — this feature isn't LMS-domain work but does touch the
same repos, so I'll use `new-features` unless told otherwise before implementation
starts.
