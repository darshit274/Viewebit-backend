# AI Workforce Skills Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 30-question AI Workforce Skills Assessment for UK recruitment agencies — a public lead-gen tool in `Viewebit-web`, scored entirely server-side by `Viewebit-backend`, stored in its own isolated table, and manageable from a new `Viewebit-AdminPanel` screen.

**Architecture:** Backend owns the question schema (`data/assessmentQuestions.js`) and a pure scoring engine (`services/assessmentScoringEngine.js`); the frontend fetches the schema and renders generically, submits raw answers, and renders whatever the backend computes. No shared tables/FKs with LMS domain models — one new table, `assessment_leads`, following the existing `ContactQuery` isolation pattern.

**Tech Stack:** Node/Express/Sequelize/MySQL (backend, existing), React/TypeScript/Vite/Tailwind/axios (both frontends, existing). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-27-ai-workforce-assessment-design.md`

## Global Constraints

- No shared tables/foreign keys into LMS domain models (`users`, `admins` excepted only via the same non-constrained `constraints: false` association pattern `ContactQuery` already uses).
- Scoring happens only on the backend; the frontend never computes or can guess the score.
- UK English throughout all user-facing copy (organisation, personalised, analyse, behaviour — never the US spellings).
- No commits/pushes during this implementation — the user will review manually and commit when ready. Do not run `git commit` or `git push` in any step below even though the writing-plans template normally ends each task with a commit step.
- No `claude-in-chrome` browser verification — the user will check the running app manually. Verification steps below use scripts, `npm run build`, and `npm run lint` only.
- No new test framework — neither `Viewebit-backend` nor `Viewebit-web`/`Viewebit-AdminPanel` currently have one (`package.json` confirms). Backend logic is verified with small standalone Node scripts under `scripts/`, matching this repo's existing convention (`scripts/validate-all-pdfs.js` etc.). Frontend changes are verified with `npm run build` and `npm run lint`.
- Exactly 30 questions (3 + 10 confidence matrix + 4 workflow-frequency matrix + 2 use-case + 5 scenarios + 6 readiness matrix), matching the spec's trimmed Section 3.

---

## Batch A — Backend (`Viewebit-backend`, branch `new-features`)

### Task 1: Question schema + scoring engine

**Files:**
- Create: `Viewebit-backend/data/assessmentQuestions.js`
- Create: `Viewebit-backend/services/assessmentScoringEngine.js`
- Create: `Viewebit-backend/scripts/verify-assessment-scoring.js`

**Interfaces:**
- Consumes: nothing (no dependency on other tasks).
- Produces: `data/assessmentQuestions.js` exports `{ SECTIONS, LEAD_FIELDS, toPublicSchema() }`. `services/assessmentScoringEngine.js` exports `{ computeAssessmentResult(answers), MATURITY_LEVELS }` where `computeAssessmentResult` returns `{ overallScore, maturityLevel, dimensionScores: { aiFluency, workflowApplication, prompting, responsibleAI, organisationalReadiness }, topOpportunities: [{key,title,explanation}], topGaps: [{key,title,explanation}], recommendedPriorities: [string] }`. Task 3 (controller) imports both modules by these exact names.

- [ ] **Step 1: Write the question schema**

Create `Viewebit-backend/data/assessmentQuestions.js`:

```js
'use strict';

const SECTIONS = [
  {
    id: 'about_agency',
    title: 'About Your Agency',
    questions: [
      {
        id: 'agency_type',
        type: 'single-select',
        prompt: 'What type of recruitment business are you?',
        options: [
          { value: 'generalist', label: 'Generalist recruitment' },
          { value: 'specialist', label: 'Specialist recruitment' },
          { value: 'executive_search', label: 'Executive search' },
          { value: 'it_tech', label: 'IT / Technology recruitment' },
          { value: 'healthcare', label: 'Healthcare recruitment' },
          { value: 'engineering', label: 'Engineering recruitment' },
          { value: 'finance', label: 'Finance / Accounting recruitment' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        id: 'team_size',
        type: 'single-select',
        prompt: 'Approximately how large is your recruitment team?',
        options: [
          { value: '1-5', label: '1–5' },
          { value: '6-15', label: '6–15' },
          { value: '16-30', label: '16–30' },
          { value: '31-75', label: '31–75' },
          { value: '76-150', label: '76–150' },
          { value: '150+', label: '150+' }
        ]
      },
      {
        id: 'ai_approach',
        type: 'single-select',
        prompt: 'Which best describes your current approach to AI?',
        options: [
          { value: 'not_using', label: 'We are not using AI yet', points: 0 },
          { value: 'few_individuals', label: 'A few individuals use AI independently', points: 25 },
          { value: 'introducing', label: 'We have started introducing AI tools', points: 50 },
          { value: 'several_workflows', label: 'AI is used across several workflows', points: 75 },
          { value: 'operating_model', label: 'AI is becoming part of our operating model', points: 100 }
        ],
        dimensions: [{ key: 'organisationalReadiness', weight: 1 }]
      }
    ]
  },
  {
    id: 'ai_confidence',
    title: 'AI Confidence',
    matrix: true,
    scaleType: 'confidence-1-5',
    rows: [
      { id: 'conf_prompting', label: 'Writing effective AI prompts', dimensions: [{ key: 'prompting', weight: 1 }] },
      { id: 'conf_research', label: 'Using AI to research candidates', dimensions: [{ key: 'workflowApplication', weight: 1 }] },
      { id: 'conf_jd', label: 'Using AI to improve job descriptions', dimensions: [{ key: 'prompting', weight: 1 }] },
      { id: 'conf_personalise', label: 'Using AI to personalise candidate communication', dimensions: [{ key: 'prompting', weight: 1 }] },
      { id: 'conf_summarise', label: 'Using AI to summarise CVs or profiles', dimensions: [{ key: 'workflowApplication', weight: 1 }] },
      { id: 'conf_interview', label: 'Using AI to prepare interview questions', dimensions: [{ key: 'workflowApplication', weight: 1 }] },
      { id: 'conf_analyse', label: 'Using AI to analyse recruitment data', dimensions: [{ key: 'aiFluency', weight: 1 }] },
      { id: 'conf_verify', label: 'Checking AI-generated information', dimensions: [{ key: 'responsibleAI', weight: 1, subscore: 'verification' }] },
      { id: 'conf_confidentiality', label: 'Protecting confidential candidate/client information when using AI', dimensions: [{ key: 'responsibleAI', weight: 1, subscore: 'governance' }] },
      { id: 'conf_when_not', label: 'Identifying when AI should NOT be used', dimensions: [{ key: 'responsibleAI', weight: 1, subscore: 'verification' }] }
    ]
  },
  {
    id: 'workflow_frequency',
    title: 'Recruitment Workflow',
    matrix: true,
    scaleType: 'frequency-5',
    rows: [
      { id: 'freq_sourcing', label: 'Candidate sourcing', opportunityTask: 'sourcing' },
      { id: 'freq_screening', label: 'CV screening', opportunityTask: 'screening' },
      { id: 'freq_outreach', label: 'Candidate outreach', opportunityTask: 'outreach' },
      { id: 'freq_reporting', label: 'Reporting & administration', opportunityTask: 'reporting' }
    ]
  },
  {
    id: 'use_case_maturity',
    title: 'AI Use-Case Maturity',
    questions: [
      {
        id: 'use_cases',
        type: 'multi-select',
        prompt: 'Which of these are your recruiters currently using AI for?',
        options: [
          { value: 'writing_emails', label: 'Writing emails', opportunityTasks: ['outreach'] },
          { value: 'writing_jds', label: 'Writing job descriptions', opportunityTasks: [] },
          { value: 'candidate_research', label: 'Candidate research', opportunityTasks: ['sourcing'] },
          { value: 'cv_summarisation', label: 'CV summarisation', opportunityTasks: ['screening'] },
          { value: 'candidate_matching', label: 'Candidate matching', opportunityTasks: ['sourcing', 'screening'] },
          { value: 'interview_prep', label: 'Interview preparation', opportunityTasks: [] },
          { value: 'market_research', label: 'Market research', opportunityTasks: [] },
          { value: 'data_analysis', label: 'Data analysis', opportunityTasks: ['reporting'] },
          { value: 'crm_admin', label: 'CRM/admin support', opportunityTasks: ['reporting'] },
          { value: 'content_creation', label: 'Content creation', opportunityTasks: ['outreach'] },
          { value: 'meeting_summaries', label: 'Meeting summaries', opportunityTasks: [] },
          { value: 'none', label: 'None of these', opportunityTasks: [] }
        ]
      },
      {
        id: 'effectiveness',
        type: 'scale-1-5',
        prompt: 'How confident are you that your team is using AI effectively, rather than simply using AI occasionally?',
        dimensions: [{ key: 'aiFluency', weight: 1 }]
      }
    ]
  },
  {
    id: 'scenarios',
    title: 'Practical AI Scenarios',
    questions: [
      {
        id: 'scn_screening',
        type: 'single-select',
        prompt: 'A recruiter receives 80 CVs for a difficult-to-fill role. What would your team most likely do?',
        options: [
          { value: 'A', label: 'Manually review every CV', points: 45 },
          { value: 'B', label: 'Use AI to help identify relevant profiles, then have a recruiter validate them', points: 100 },
          { value: 'C', label: 'Ask AI to automatically select the successful candidates', points: 20 },
          { value: 'D', label: "We don't currently have a process for this", points: 10 }
        ],
        dimensions: [{ key: 'workflowApplication', weight: 0.7 }, { key: 'responsibleAI', weight: 0.3 }]
      },
      {
        id: 'scn_outreach',
        type: 'single-select',
        prompt: 'A recruiter needs to send personalised outreach to 30 potential candidates. What is the best use of AI?',
        options: [
          { value: 'A', label: 'Send the same AI-written message to everyone', points: 35 },
          { value: 'B', label: 'Use AI to create personalised drafts based on candidate context, then review before sending', points: 100 },
          { value: 'C', label: 'Let AI contact candidates without human review', points: 15 },
          { value: 'D', label: 'Write every message entirely manually', points: 50 }
        ],
        dimensions: [{ key: 'prompting', weight: 0.6 }, { key: 'workflowApplication', weight: 0.4 }]
      },
      {
        id: 'scn_verify',
        type: 'single-select',
        prompt: 'Your team uses AI to summarise candidate information. What is the most important control?',
        options: [
          { value: 'A', label: 'Trust the summary if it sounds professional', points: 15 },
          { value: 'B', label: 'Have a recruiter verify important facts before using the information', points: 100 },
          { value: 'C', label: 'Avoid AI completely', points: 40 },
          { value: 'D', label: 'Ask AI whether its own answer is correct', points: 25 }
        ],
        dimensions: [{ key: 'responsibleAI', weight: 1, subscore: 'verification' }]
      },
      {
        id: 'scn_client',
        type: 'single-select',
        prompt: 'A client wants a same-day shortlist update. What is the best use of AI here?',
        options: [
          { value: 'A', label: 'Send the AI-drafted update to the client as-is', points: 30 },
          { value: 'B', label: 'Use AI to draft the update from real data, then have a recruiter check accuracy and tone before sending', points: 100 },
          { value: 'C', label: 'Write the update entirely from memory, without AI', points: 45 },
          { value: 'D', label: "We don't have a standard way of doing this", points: 10 }
        ],
        dimensions: [{ key: 'prompting', weight: 0.5 }, { key: 'workflowApplication', weight: 0.5 }]
      },
      {
        id: 'scn_confidential',
        type: 'single-select',
        prompt: "A recruiter wants to paste a client's confidential job specification into a public AI tool to speed up drafting. What should happen?",
        options: [
          { value: 'A', label: "Paste it in — it's just a job spec", points: 10 },
          { value: 'B', label: 'Use an approved, secure AI tool per policy, or remove identifying details first', points: 100 },
          { value: 'C', label: 'Never use AI anywhere near client data', points: 40 },
          { value: 'D', label: 'No policy exists either way', points: 20 }
        ],
        dimensions: [{ key: 'responsibleAI', weight: 1, subscore: 'governance' }]
      }
    ]
  },
  {
    id: 'workforce_readiness',
    title: 'Workforce Readiness',
    matrix: true,
    scaleType: 'confidence-1-5',
    rows: [
      { id: 'ready_leadership', label: 'Does leadership actively encourage responsible AI experimentation?', dimensions: [{ key: 'organisationalReadiness', weight: 1 }] },
      { id: 'ready_process', label: 'Are recruitment workflows documented well enough to identify where AI could help?', dimensions: [{ key: 'organisationalReadiness', weight: 1 }] },
      { id: 'ready_skills', label: 'Do recruiters know how to use AI effectively?', dimensions: [{ key: 'aiFluency', weight: 1 }] },
      { id: 'ready_governance', label: 'Does the agency have guidelines for responsible AI use?', dimensions: [{ key: 'responsibleAI', weight: 1, subscore: 'governance' }] },
      { id: 'ready_measurement', label: 'Does the agency measure whether AI actually saves time or improves outcomes?', dimensions: [{ key: 'organisationalReadiness', weight: 1 }] },
      { id: 'ready_adoption', label: 'Is AI use consistent across the team, or dependent on a few individuals?', dimensions: [{ key: 'organisationalReadiness', weight: 1 }] }
    ]
  }
];

const LEAD_FIELDS = [
  { id: 'first_name', label: 'First name', type: 'text', required: true },
  { id: 'last_name', label: 'Last name', type: 'text', required: true },
  { id: 'work_email', label: 'Work email', type: 'email', required: true },
  { id: 'agency_name', label: 'Agency name', type: 'text', required: true },
  { id: 'job_title', label: 'Job title', type: 'text', required: true },
  {
    id: 'employee_count_band',
    label: 'Number of employees',
    type: 'single-select',
    required: true,
    options: [
      { value: '1-10', label: '1–10' },
      { value: '11-50', label: '11–50' },
      { value: '51-200', label: '51–200' },
      { value: '201-500', label: '201–500' },
      { value: '500+', label: '500+' }
    ]
  },
  { id: 'phone', label: 'Phone number (optional)', type: 'tel', required: false }
];

function toPublicSchema() {
  return {
    sections: SECTIONS.map((section) => {
      if (section.matrix) {
        return {
          id: section.id,
          title: section.title,
          matrix: true,
          scaleType: section.scaleType,
          rows: section.rows.map((row) => ({ id: row.id, label: row.label }))
        };
      }
      return {
        id: section.id,
        title: section.title,
        questions: section.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options ? q.options.map((o) => ({ value: o.value, label: o.label })) : undefined
        }))
      };
    }),
    leadFields: LEAD_FIELDS
  };
}

module.exports = { SECTIONS, LEAD_FIELDS, toPublicSchema };
```

- [ ] **Step 2: Write the scoring engine**

Create `Viewebit-backend/services/assessmentScoringEngine.js`:

```js
'use strict';

const { SECTIONS } = require('../data/assessmentQuestions');

const MATURITY_LEVELS = {
  ai_explorer: {
    label: 'AI Explorer',
    minScore: 0,
    maxScore: 20,
    description: 'AI adoption is limited and the workforce needs foundational awareness and practical exposure.'
  },
  early_adopter: {
    label: 'Early Adopter',
    minScore: 21,
    maxScore: 40,
    description: 'Some individuals are experimenting with AI, but usage is inconsistent.'
  },
  developing: {
    label: 'Developing',
    minScore: 41,
    maxScore: 60,
    description: 'The agency has meaningful AI usage but has clear skills, process or governance gaps.'
  },
  ai_ready: {
    label: 'AI Ready',
    minScore: 61,
    maxScore: 80,
    description: 'AI is becoming embedded into workflows, but further workforce development can improve consistency and ROI.'
  },
  ai_enabled: {
    label: 'AI Enabled',
    minScore: 81,
    maxScore: 100,
    description: 'The organisation demonstrates strong AI capability, adoption and operational readiness.'
  }
};

const OPPORTUNITY_TEMPLATES = {
  sourcing: {
    title: 'Candidate Sourcing',
    explanation: 'Your team spends meaningful time sourcing candidates. Structured AI workflows could help surface strong profiles faster while recruiters stay responsible for outreach and judgement calls.'
  },
  screening: {
    title: 'Candidate Screening',
    explanation: 'CV screening looks like a significant time draw for your team. AI-assisted shortlisting, with a recruiter validating every match, could free up hours without losing quality control.'
  },
  outreach: {
    title: 'Candidate Outreach',
    explanation: 'Personalised outreach takes real time to do well. AI-drafted, recruiter-reviewed messaging could help your team reach more candidates without it feeling generic.'
  },
  reporting: {
    title: 'Recruitment Reporting & Admin',
    explanation: 'Reporting and administrative work take up real capacity. AI support here could return hours to your desk-facing recruiters each week.'
  }
};

const OPPORTUNITY_TASK_ORDER = ['sourcing', 'screening', 'outreach', 'reporting'];

const GAP_TEMPLATES = {
  prompting: {
    title: 'Prompting & AI Instruction',
    explanation: 'Your team may benefit from learning how to give AI clearer context, constraints, examples and desired outputs.'
  },
  workflowApplication: {
    title: 'Workflow Integration',
    explanation: 'Your team may know how to use AI tools but may not yet have repeatable workflows that embed AI into daily recruitment processes.'
  },
  aiFluency: {
    title: 'AI Fluency & Practical Skills',
    explanation: 'Your recruiters may benefit from more hands-on practice using AI day-to-day, so confidence grows from real use rather than occasional experimentation.'
  },
  responsibleAI_verification: {
    title: 'AI Verification',
    explanation: 'Your team may need stronger processes for checking AI-generated information before it influences candidate or client decisions.'
  },
  responsibleAI_governance: {
    title: 'AI Governance',
    explanation: 'Your organisation may benefit from clearer guidelines around confidential information, human oversight and responsible AI use.'
  },
  organisationalReadiness: {
    title: 'Organisational AI Readiness',
    explanation: 'Your organisation may benefit from clearer leadership sponsorship, documented workflows and consistent measurement to help AI adoption move beyond individual effort.'
  }
};

function normaliseScale1to5(rawValue) {
  const n = Number(rawValue);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return ((n - 1) / 4) * 100;
}

function findOptionPoints(options, rawValue) {
  const match = options.find((opt) => opt.value === rawValue);
  return match ? match.points : null;
}

function bandForScore(score) {
  if (score <= 20) return 'ai_explorer';
  if (score <= 40) return 'early_adopter';
  if (score <= 60) return 'developing';
  if (score <= 80) return 'ai_ready';
  return 'ai_enabled';
}

function collectDimensionSignals(answers) {
  const signals = {
    aiFluency: [],
    workflowApplication: [],
    prompting: [],
    responsibleAI: [],
    organisationalReadiness: []
  };
  const subscoreSignals = { verification: [], governance: [] };

  const pushSignal = (dims, value) => {
    if (value === null || value === undefined) return;
    dims.forEach(({ key, weight, subscore }) => {
      signals[key].push({ value, weight });
      if (subscore) subscoreSignals[subscore].push({ value, weight });
    });
  };

  SECTIONS.forEach((section) => {
    if (section.matrix) {
      section.rows.forEach((row) => {
        if (!row.dimensions) return;
        pushSignal(row.dimensions, normaliseScale1to5(answers[row.id]));
      });
    } else {
      section.questions.forEach((q) => {
        if (!q.dimensions) return;
        let value = null;
        if (q.type === 'scale-1-5') {
          value = normaliseScale1to5(answers[q.id]);
        } else if (q.options) {
          value = findOptionPoints(q.options, answers[q.id]);
        }
        pushSignal(q.dimensions, value);
      });
    }
  });

  return { signals, subscoreSignals };
}

function weightedAverage(items) {
  if (!items || items.length === 0) return null;
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight === 0) return null;
  const weightedSum = items.reduce((sum, i) => sum + i.value * i.weight, 0);
  return weightedSum / totalWeight;
}

function computeOpportunities(answers) {
  const taskFrequency = {};
  SECTIONS.forEach((section) => {
    if (!section.matrix || section.scaleType !== 'frequency-5') return;
    section.rows.forEach((row) => {
      if (!row.opportunityTask) return;
      const value = normaliseScale1to5(answers[row.id]);
      if (value !== null) taskFrequency[row.opportunityTask] = value;
    });
  });

  const usedTasks = new Set();
  const useCasesSection = SECTIONS.find((s) => s.id === 'use_case_maturity');
  const useCasesQuestion = useCasesSection && useCasesSection.questions.find((q) => q.id === 'use_cases');
  const selected = Array.isArray(answers.use_cases) ? answers.use_cases : [];
  if (useCasesQuestion) {
    useCasesQuestion.options.forEach((opt) => {
      if (selected.includes(opt.value) && opt.opportunityTasks) {
        opt.opportunityTasks.forEach((t) => usedTasks.add(t));
      }
    });
  }

  const candidates = OPPORTUNITY_TASK_ORDER
    .filter((task) => taskFrequency[task] !== undefined)
    .map((task) => ({ task, frequency: taskFrequency[task], isGap: !usedTasks.has(task) }))
    .sort((a, b) => b.frequency - a.frequency);

  const flagged = candidates.filter((c) => c.isGap && c.frequency >= 50);
  const rest = candidates.filter((c) => !flagged.includes(c));
  const ranked = [...flagged, ...rest].slice(0, 3);

  return ranked.map((c) => ({ key: c.task, ...OPPORTUNITY_TEMPLATES[c.task] }));
}

function computeGaps(dimensionScores, subscores) {
  const entries = Object.entries(dimensionScores).sort((a, b) => a[1] - b[1]);
  const gaps = [];
  const maxGaps = 4;

  for (const [key] of entries) {
    if (gaps.length >= maxGaps) break;
    if (gaps.length >= 2 && dimensionScores[key] >= 60) break;

    if (key === 'responsibleAI') {
      const verify = subscores.verification;
      const govern = subscores.governance;
      const addVerify = verify !== null && verify < 60;
      const addGovern = govern !== null && govern < 60;

      if (addVerify && addGovern && gaps.length <= maxGaps - 2) {
        gaps.push({ key: 'responsibleAI_verification', ...GAP_TEMPLATES.responsibleAI_verification });
        gaps.push({ key: 'responsibleAI_governance', ...GAP_TEMPLATES.responsibleAI_governance });
      } else if (addGovern && (!addVerify || govern <= verify)) {
        gaps.push({ key: 'responsibleAI_governance', ...GAP_TEMPLATES.responsibleAI_governance });
      } else {
        gaps.push({ key: 'responsibleAI_verification', ...GAP_TEMPLATES.responsibleAI_verification });
      }
    } else {
      gaps.push({ key, ...GAP_TEMPLATES[key] });
    }
  }

  return gaps.slice(0, maxGaps);
}

function computeAssessmentResult(answers) {
  const { signals, subscoreSignals } = collectDimensionSignals(answers);

  const dimensionScores = {
    aiFluency: Math.round(weightedAverage(signals.aiFluency) ?? 0),
    workflowApplication: Math.round(weightedAverage(signals.workflowApplication) ?? 0),
    prompting: Math.round(weightedAverage(signals.prompting) ?? 0),
    responsibleAI: Math.round(weightedAverage(signals.responsibleAI) ?? 0),
    organisationalReadiness: Math.round(weightedAverage(signals.organisationalReadiness) ?? 0)
  };

  const subscores = {
    verification: weightedAverage(subscoreSignals.verification),
    governance: weightedAverage(subscoreSignals.governance)
  };

  const overallScore = Math.round(
    Object.values(dimensionScores).reduce((sum, v) => sum + v, 0) / Object.keys(dimensionScores).length
  );

  const maturityLevel = bandForScore(overallScore);
  const topOpportunities = computeOpportunities(answers);
  const topGaps = computeGaps(dimensionScores, subscores);
  const recommendedPriorities = topGaps.map((g) => g.title);

  return { overallScore, maturityLevel, dimensionScores, topOpportunities, topGaps, recommendedPriorities };
}

module.exports = { computeAssessmentResult, MATURITY_LEVELS };
```

- [ ] **Step 3: Write and run the verification script**

Create `Viewebit-backend/scripts/verify-assessment-scoring.js`:

```js
require('dotenv').config();
const { computeAssessmentResult } = require('../services/assessmentScoringEngine');

function buildAnswers({ scale, aiApproach, scenarios, useCases }) {
  return {
    agency_type: 'generalist',
    team_size: '6-15',
    ai_approach: aiApproach,
    conf_prompting: scale, conf_research: scale, conf_jd: scale,
    conf_personalise: scale, conf_summarise: scale, conf_interview: scale,
    conf_analyse: scale, conf_verify: scale, conf_confidentiality: scale, conf_when_not: scale,
    freq_sourcing: scale, freq_screening: scale, freq_outreach: scale, freq_reporting: scale,
    use_cases: useCases,
    effectiveness: scale,
    scn_screening: scenarios.scn_screening, scn_outreach: scenarios.scn_outreach,
    scn_verify: scenarios.scn_verify, scn_client: scenarios.scn_client,
    scn_confidential: scenarios.scn_confidential,
    ready_leadership: scale, ready_process: scale, ready_skills: scale,
    ready_governance: scale, ready_measurement: scale, ready_adoption: scale
  };
}

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures += 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

const low = computeAssessmentResult(buildAnswers({
  scale: 1,
  aiApproach: 'not_using',
  scenarios: { scn_screening: 'D', scn_outreach: 'C', scn_verify: 'A', scn_client: 'D', scn_confidential: 'A' },
  useCases: ['none']
}));
assert(low.maturityLevel === 'ai_explorer', `worst-case answers land in ai_explorer band (got ${low.maturityLevel}, score ${low.overallScore})`);
assert(low.topGaps.length >= 2, `worst-case answers surface at least 2 gaps (got ${low.topGaps.length})`);
assert(low.topOpportunities.length === 3, `worst-case answers still surface 3 opportunities (got ${low.topOpportunities.length})`);

const high = computeAssessmentResult(buildAnswers({
  scale: 5,
  aiApproach: 'operating_model',
  scenarios: { scn_screening: 'B', scn_outreach: 'B', scn_verify: 'B', scn_client: 'B', scn_confidential: 'B' },
  useCases: ['candidate_research', 'cv_summarisation', 'writing_emails', 'data_analysis']
}));
assert(high.maturityLevel === 'ai_enabled', `best-case answers land in ai_enabled band (got ${high.maturityLevel}, score ${high.overallScore})`);
assert(high.overallScore === 100, `best-case answers score exactly 100 (got ${high.overallScore})`);

const mixed = computeAssessmentResult(buildAnswers({
  scale: 3,
  aiApproach: 'introducing',
  scenarios: { scn_screening: 'B', scn_outreach: 'B', scn_verify: 'B', scn_client: 'B', scn_confidential: 'B' },
  useCases: ['candidate_research']
}));
assert(mixed.overallScore > low.overallScore && mixed.overallScore < high.overallScore, `mixed answers score strictly between worst and best case (got ${mixed.overallScore}, low ${low.overallScore}, high ${high.overallScore})`);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log('\nAll assessment scoring checks passed.');
  process.exit(0);
}
```

Run: `node scripts/verify-assessment-scoring.js` from `Viewebit-backend/`
Expected: every line printed as `PASS: ...` and a final `All assessment scoring checks passed.` with exit code 0. If any `FAIL:` line prints, fix the scoring engine (not the script) until all pass.

---

### Task 2: Migration + Sequelize model

**Files:**
- Create: `Viewebit-backend/migrations/20260827000001-create-assessment-leads.js`
- Create: `Viewebit-backend/models/AssessmentLead.js`

**Interfaces:**
- Consumes: nothing.
- Produces: a Sequelize model registered as `db.AssessmentLead` (auto-loaded by `models/index.js`'s directory scan, same as every other model file) with the columns listed below. Task 3 imports it via `const { AssessmentLead, Admin } = require('../models')`.

- [ ] **Step 1: Write the migration**

Create `Viewebit-backend/migrations/20260827000001-create-assessment-leads.js`:

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('assessment_leads')) {
      return;
    }

    await queryInterface.createTable('assessment_leads', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      work_email: { type: Sequelize.STRING(255), allowNull: false },
      agency_name: { type: Sequelize.STRING(255), allowNull: false },
      job_title: { type: Sequelize.STRING(150), allowNull: false },
      employee_count_band: { type: Sequelize.STRING(20), allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      agency_type: { type: Sequelize.STRING(50), allowNull: false },
      current_ai_approach: { type: Sequelize.STRING(50), allowNull: false },
      answers: { type: Sequelize.JSON, allowNull: false },
      overall_score: { type: Sequelize.INTEGER, allowNull: false },
      maturity_level: {
        type: Sequelize.ENUM('ai_explorer', 'early_adopter', 'developing', 'ai_ready', 'ai_enabled'),
        allowNull: false
      },
      dimension_scores: { type: Sequelize.JSON, allowNull: false },
      top_opportunities: { type: Sequelize.JSON, allowNull: false },
      top_gaps: { type: Sequelize.JSON, allowNull: false },
      recommended_priorities: { type: Sequelize.JSON, allowNull: false },
      status: {
        type: Sequelize.ENUM('new', 'contacted', 'qualified', 'unqualified', 'closed'),
        allowNull: false,
        defaultValue: 'new'
      },
      admin_notes: { type: Sequelize.TEXT, allowNull: true },
      contacted_at: { type: Sequelize.DATE, allowNull: true },
      contacted_by: { type: Sequelize.INTEGER, allowNull: true },
      email_sent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      email_sent_at: { type: Sequelize.DATE, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('assessment_leads', ['work_email'], { name: 'assessment_leads_work_email' });
    await queryInterface.addIndex('assessment_leads', ['status'], { name: 'assessment_leads_status' });
    await queryInterface.addIndex('assessment_leads', ['created_at'], { name: 'assessment_leads_created_at' });
    await queryInterface.addIndex('assessment_leads', ['agency_type'], { name: 'assessment_leads_agency_type' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('assessment_leads');
  }
};
```

- [ ] **Step 2: Write the model**

Create `Viewebit-backend/models/AssessmentLead.js`:

```js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AssessmentLead = sequelize.define('AssessmentLead', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    first_name: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: { msg: 'First name is required' } } },
    last_name: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: { msg: 'Last name is required' } } },
    work_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: { msg: 'Please provide a valid work email address' },
        notEmpty: { msg: 'Work email is required' }
      }
    },
    agency_name: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: { msg: 'Agency name is required' } } },
    job_title: { type: DataTypes.STRING(150), allowNull: false, validate: { notEmpty: { msg: 'Job title is required' } } },
    employee_count_band: { type: DataTypes.STRING(20), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    agency_type: { type: DataTypes.STRING(50), allowNull: false },
    current_ai_approach: { type: DataTypes.STRING(50), allowNull: false },
    answers: { type: DataTypes.JSON, allowNull: false },
    overall_score: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 100 } },
    maturity_level: {
      type: DataTypes.ENUM('ai_explorer', 'early_adopter', 'developing', 'ai_ready', 'ai_enabled'),
      allowNull: false
    },
    dimension_scores: { type: DataTypes.JSON, allowNull: false },
    top_opportunities: { type: DataTypes.JSON, allowNull: false },
    top_gaps: { type: DataTypes.JSON, allowNull: false },
    recommended_priorities: { type: DataTypes.JSON, allowNull: false },
    status: {
      type: DataTypes.ENUM('new', 'contacted', 'qualified', 'unqualified', 'closed'),
      defaultValue: 'new',
      allowNull: false
    },
    admin_notes: { type: DataTypes.TEXT, allowNull: true },
    contacted_at: { type: DataTypes.DATE, allowNull: true },
    contacted_by: { type: DataTypes.INTEGER, allowNull: true },
    email_sent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    email_sent_at: { type: DataTypes.DATE, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: false }
  }, {
    tableName: 'assessment_leads',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['work_email'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
      { fields: ['agency_type'] }
    ]
  });

  AssessmentLead.associate = function (models) {
    AssessmentLead.belongsTo(models.Admin, {
      as: 'contactedByAdmin',
      foreignKey: 'contacted_by',
      constraints: false
    });
  };

  return AssessmentLead;
};
```

- [ ] **Step 3: Run the migration against the local dev database**

Run: `npx sequelize-cli db:migrate` from `Viewebit-backend/`
Expected: `== 20260827000001-create-assessment-leads: migrating =======` then `== 20260827000001-create-assessment-leads: migrated (Xs)` with no error. If it errors, read the error, fix the migration file, and re-run — do not hand-edit the database directly.

---

### Task 3: Email template

**Files:**
- Create: `Viewebit-backend/utils/emailTemplates/assessmentResultEmail.js`

**Interfaces:**
- Consumes: nothing (pure function, no imports beyond Node built-ins).
- Produces: `buildAssessmentResultEmail({ firstName, result })` returning `{ subject, htmlContent }`, where `result` is exactly the shape `computeAssessmentResult` returns (Task 1). Task 4's controller calls this and passes `{ subject, htmlContent }` straight into `sendMail({ receiver, subject, htmlContent })`.

- [ ] **Step 1: Write the email template module**

Create `Viewebit-backend/utils/emailTemplates/assessmentResultEmail.js`:

```js
'use strict';

const MATURITY_LABELS = {
  ai_explorer: 'AI Explorer',
  early_adopter: 'Early Adopter',
  developing: 'Developing',
  ai_ready: 'AI Ready',
  ai_enabled: 'AI Enabled'
};

function buildAssessmentResultEmail({ firstName, result }) {
  const maturityLabel = MATURITY_LABELS[result.maturityLevel] || result.maturityLevel;

  const opportunitiesHtml = result.topOpportunities
    .map((o) => `<li style="margin-bottom:8px;"><strong>${o.title}</strong> — ${o.explanation}</li>`)
    .join('');

  const gapsHtml = result.topGaps
    .map((g) => `<li style="margin-bottom:8px;"><strong>${g.title}</strong> — ${g.explanation}</li>`)
    .join('');

  const subject = 'Your AI Workforce Readiness Snapshot';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #111827;">Hi ${firstName},</h2>
      <p>Thanks for completing the AI Workforce Skills Assessment. Here is your organisation's snapshot:</p>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
        <div style="font-size: 40px; font-weight: bold; color: #4f46e5;">${result.overallScore} / 100</div>
        <div style="font-size: 18px; font-weight: 600; margin-top: 4px;">${maturityLabel}</div>
      </div>

      <h3 style="margin-bottom: 8px;">Where AI Could Create the Most Value</h3>
      <ul style="padding-left: 20px;">${opportunitiesHtml}</ul>

      <h3 style="margin-bottom: 8px;">Your Biggest Workforce Skill Gaps</h3>
      <ul style="padding-left: 20px;">${gapsHtml}</ul>

      <p style="margin-top: 24px;">Want to turn this diagnosis into an action plan? Viewebit can help recruitment
      agencies move from AI experimentation to practical workforce capability — starting with the skills your
      team actually needs.</p>

      <p style="text-align: center; margin: 24px 0;">
        <a href="https://edu.viewebit.com/contact" style="background: #4f46e5; color: #ffffff; padding: 12px 24px;
        border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Discuss Your AI Workforce Roadmap</a>
      </p>

      <p style="font-size: 12px; color: #6b7280;">— The Viewebit Team</p>
    </div>
  `;

  return { subject, htmlContent };
}

module.exports = { buildAssessmentResultEmail, MATURITY_LABELS };
```

- [ ] **Step 2: Verify it loads and produces well-formed output**

Run this one-off check from `Viewebit-backend/`:

```bash
node -e "
const { buildAssessmentResultEmail } = require('./utils/emailTemplates/assessmentResultEmail');
const out = buildAssessmentResultEmail({
  firstName: 'Priya',
  result: {
    overallScore: 68,
    maturityLevel: 'ai_ready',
    topOpportunities: [{ title: 'Candidate Research', explanation: 'Example.' }],
    topGaps: [{ title: 'Prompting & AI Instruction', explanation: 'Example.' }]
  }
});
if (!out.subject || !out.htmlContent.includes('68 / 100') || !out.htmlContent.includes('AI Ready')) {
  console.error('FAIL: email template missing expected content');
  process.exit(1);
}
console.log('PASS: email template renders score and maturity label');
"
```

Expected: `PASS: email template renders score and maturity label`.

---

### Task 4: Controller + Routes + mount

**Files:**
- Create: `Viewebit-backend/controllers/AssessmentController.js`
- Create: `Viewebit-backend/routes/assessmentRoutes.js`
- Modify: `Viewebit-backend/routes/index.js`

**Interfaces:**
- Consumes: `AssessmentLead`, `Admin` from `../models` (Task 2); `SECTIONS`, `LEAD_FIELDS`, `toPublicSchema` from `../data/assessmentQuestions` (Task 1); `computeAssessmentResult`, `MATURITY_LEVELS` from `../services/assessmentScoringEngine` (Task 1); `buildAssessmentResultEmail` from `../utils/emailTemplates/assessmentResultEmail` (Task 3); `sendMail` from `../utils/verifyEmail` (existing); `adminAuth` from `../utils/AdminAuth` (existing); `ErrorHandler` from `../utils/default/errorHandler` (existing).
- Produces: `GET /api/assessment/questions`, `POST /api/assessment/submit`, `GET /api/assessment/admin/leads`, `GET /api/assessment/admin/leads/stats`, `GET /api/assessment/admin/leads/:id`, `PATCH /api/assessment/admin/leads/:id/status`. `POST /submit` response shape (used by Task 5/6 frontend): `{ success, message, data: { id, overallScore, maturityLevel, maturityLabel, maturityDescription, dimensionScores, topOpportunities, topGaps, recommendedPriorities } }`.

- [ ] **Step 1: Write the controller**

Create `Viewebit-backend/controllers/AssessmentController.js`:

```js
const ErrorHandler = require('../utils/default/errorHandler');
const { AssessmentLead, Admin } = require('../models');
const { Op } = require('sequelize');
const { SECTIONS, LEAD_FIELDS, toPublicSchema } = require('../data/assessmentQuestions');
const { computeAssessmentResult, MATURITY_LEVELS } = require('../services/assessmentScoringEngine');
const { sendMail } = require('../utils/verifyEmail');
const { buildAssessmentResultEmail } = require('../utils/emailTemplates/assessmentResultEmail');

const REQUIRED_LEAD_FIELDS = LEAD_FIELDS.filter((f) => f.required).map((f) => f.id);

function collectAllQuestionIds() {
  const ids = [];
  SECTIONS.forEach((section) => {
    if (section.matrix) {
      section.rows.forEach((row) => ids.push(row.id));
    } else {
      section.questions.forEach((q) => ids.push(q.id));
    }
  });
  return ids;
}
const ALL_QUESTION_IDS = collectAllQuestionIds();

// GET /api/assessment/questions (public)
exports.getQuestions = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: toPublicSchema() });
  } catch (err) {
    console.error('Get assessment questions error:', err);
    return next(new ErrorHandler('Failed to load assessment questions', 500));
  }
};

// POST /api/assessment/submit (public)
exports.submitAssessment = async (req, res, next) => {
  try {
    const { leadInfo = {}, answers = {} } = req.body;

    if (req.body.website) {
      return res.status(400).json({ success: false, message: 'Invalid submission' });
    }

    const missingLeadFields = REQUIRED_LEAD_FIELDS.filter((field) => !leadInfo[field]);
    if (missingLeadFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: missingLeadFields.map((field) => ({ field, message: `${field} is required` }))
      });
    }

    const missingAnswers = ALL_QUESTION_IDS.filter(
      (id) => answers[id] === undefined || answers[id] === null || answers[id] === ''
    );
    if (missingAnswers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please answer every question before submitting.',
        errors: missingAnswers.map((id) => ({ field: id, message: 'This question is required' }))
      });
    }

    const result = computeAssessmentResult(answers);

    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.headers['user-agent'];

    const lead = await AssessmentLead.create({
      first_name: leadInfo.first_name,
      last_name: leadInfo.last_name,
      work_email: leadInfo.work_email,
      agency_name: leadInfo.agency_name,
      job_title: leadInfo.job_title,
      employee_count_band: leadInfo.employee_count_band,
      phone: leadInfo.phone || null,
      agency_type: answers.agency_type,
      current_ai_approach: answers.ai_approach,
      answers,
      overall_score: result.overallScore,
      maturity_level: result.maturityLevel,
      dimension_scores: result.dimensionScores,
      top_opportunities: result.topOpportunities,
      top_gaps: result.topGaps,
      recommended_priorities: result.recommendedPriorities,
      ip_address,
      user_agent,
      completed_at: new Date()
    });

    try {
      const { subject, htmlContent } = buildAssessmentResultEmail({ firstName: leadInfo.first_name, result });
      await sendMail({ receiver: leadInfo.work_email, subject, htmlContent });
      await lead.update({ email_sent: true, email_sent_at: new Date() });
    } catch (emailErr) {
      console.error('Assessment result email failed to send:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Assessment submitted successfully',
      data: {
        id: lead.id,
        overallScore: result.overallScore,
        maturityLevel: result.maturityLevel,
        maturityLabel: MATURITY_LEVELS[result.maturityLevel].label,
        maturityDescription: MATURITY_LEVELS[result.maturityLevel].description,
        dimensionScores: result.dimensionScores,
        topOpportunities: result.topOpportunities,
        topGaps: result.topGaps,
        recommendedPriorities: result.recommendedPriorities
      }
    });
  } catch (err) {
    console.error('Submit assessment error:', err);
    if (err.name === 'SequelizeValidationError') {
      const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    return next(new ErrorHandler('Failed to submit assessment. Please try again.', 500));
  }
};

// GET /api/assessment/admin/leads (admin)
exports.getAllLeads = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '', sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const whereClause = {};
    if (status && status !== 'all') whereClause.status = status;
    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { work_email: { [Op.like]: `%${search}%` } },
        { agency_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: leads } = await AssessmentLead.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [{ model: Admin, as: 'contactedByAdmin', attributes: ['id', 'name', 'email'] }]
    });

    const stats = {
      total: await AssessmentLead.count(),
      new: await AssessmentLead.count({ where: { status: 'new' } }),
      contacted: await AssessmentLead.count({ where: { status: 'contacted' } }),
      qualified: await AssessmentLead.count({ where: { status: 'qualified' } })
    };

    const totalPages = Math.ceil(count / parseInt(limit));
    const currentPage = parseInt(page);

    res.status(200).json({
      success: true,
      data: {
        leads,
        pagination: {
          currentPage,
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1
        },
        stats
      }
    });
  } catch (err) {
    console.error('Get all assessment leads error:', err);
    return next(new ErrorHandler('Failed to fetch assessment leads', 500));
  }
};

// GET /api/assessment/admin/leads/:id (admin)
exports.getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await AssessmentLead.findByPk(id, {
      include: [{ model: Admin, as: 'contactedByAdmin', attributes: ['id', 'name', 'email'] }]
    });
    if (!lead) return next(new ErrorHandler('Assessment lead not found', 404));
    res.status(200).json({ success: true, data: lead });
  } catch (err) {
    console.error('Get assessment lead by ID error:', err);
    return next(new ErrorHandler('Failed to fetch assessment lead', 500));
  }
};

// PATCH /api/assessment/admin/leads/:id/status (admin)
exports.updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const adminId = req.admin.id;

    const validStatuses = ['new', 'contacted', 'qualified', 'unqualified', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return next(new ErrorHandler(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
    }

    const lead = await AssessmentLead.findByPk(id);
    if (!lead) return next(new ErrorHandler('Assessment lead not found', 404));

    const updateData = { status };
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
    if (status === 'contacted' && !lead.contacted_at) {
      updateData.contacted_at = new Date();
      updateData.contacted_by = adminId;
    }

    await lead.update(updateData);

    const updatedLead = await AssessmentLead.findByPk(id, {
      include: [{ model: Admin, as: 'contactedByAdmin', attributes: ['id', 'name', 'email'] }]
    });

    res.status(200).json({ success: true, message: 'Assessment lead updated successfully', data: updatedLead });
  } catch (err) {
    console.error('Update assessment lead status error:', err);
    if (err.name === 'SequelizeValidationError') {
      const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    return next(new ErrorHandler('Failed to update assessment lead', 500));
  }
};

// GET /api/assessment/admin/leads/stats (admin)
exports.getStats = async (req, res, next) => {
  try {
    const total = await AssessmentLead.count();
    const byStatus = {};
    for (const s of ['new', 'contacted', 'qualified', 'unqualified', 'closed']) {
      byStatus[s] = await AssessmentLead.count({ where: { status: s } });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await AssessmentLead.count({ where: { created_at: { [Op.gte]: today } } });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCount = await AssessmentLead.count({ where: { created_at: { [Op.gte]: weekAgo } } });

    const recentLeads = await AssessmentLead.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'first_name', 'last_name', 'agency_name', 'overall_score', 'maturity_level', 'status', 'created_at']
    });

    res.status(200).json({ success: true, data: { total, ...byStatus, todayCount, weekCount, recentLeads } });
  } catch (err) {
    console.error('Get assessment stats error:', err);
    return next(new ErrorHandler('Failed to fetch assessment statistics', 500));
  }
};
```

- [ ] **Step 2: Write the routes**

Create `Viewebit-backend/routes/assessmentRoutes.js`:

```js
const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/AssessmentController');
const { adminAuth } = require('../utils/AdminAuth');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Max 5 submissions per device per day - a genuine respondent only submits once
const submitAssessmentLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many submissions from this device. Please try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false
});

const validateSubmission = [
  body('leadInfo.first_name').trim().notEmpty().withMessage('First name is required'),
  body('leadInfo.last_name').trim().notEmpty().withMessage('Last name is required'),
  body('leadInfo.work_email').trim().notEmpty().withMessage('Work email is required')
    .isEmail().withMessage('Please provide a valid work email address').normalizeEmail(),
  body('leadInfo.agency_name').trim().notEmpty().withMessage('Agency name is required'),
  body('leadInfo.job_title').trim().notEmpty().withMessage('Job title is required'),
  body('leadInfo.employee_count_band').trim().notEmpty().withMessage('Number of employees is required'),
  body('leadInfo.phone').optional({ checkFalsy: true }).trim(),
  body('answers').isObject().withMessage('Answers are required')
];

const validateStatusUpdate = [
  body('status').notEmpty().withMessage('Status is required')
    .isIn(['new', 'contacted', 'qualified', 'unqualified', 'closed']).withMessage('Invalid status'),
  body('admin_notes').optional().isLength({ max: 5000 }).withMessage('Admin notes must not exceed 5000 characters')
];

const validateQueryParams = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isIn(['10', '20', '50']).withMessage('Limit must be 10, 20, or 50'),
  query('status').optional().isIn(['all', 'new', 'contacted', 'qualified', 'unqualified', 'closed']).withMessage('Invalid status filter'),
  query('sortBy').optional().isIn(['created_at', 'updated_at', 'overall_score']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map((err) => ({ field: err.path || err.param, message: err.msg }))
    });
  }
  next();
};

// Public routes
router.get('/questions', assessmentController.getQuestions);
router.post('/submit', submitAssessmentLimiter, validateSubmission, handleValidationErrors, assessmentController.submitAssessment);

// Admin routes
router.get('/admin/leads', adminAuth, validateQueryParams, handleValidationErrors, assessmentController.getAllLeads);
router.get('/admin/leads/stats', adminAuth, assessmentController.getStats);
router.get('/admin/leads/:id', adminAuth, assessmentController.getLeadById);
router.patch('/admin/leads/:id/status', adminAuth, validateStatusUpdate, handleValidationErrors, assessmentController.updateLeadStatus);

module.exports = router;
```

- [ ] **Step 3: Mount the routes**

Modify `Viewebit-backend/routes/index.js`:

Add near the other route requires (next to `const ContactQueryRoutes = require("./contactQueryRoutes");`):

```js
const AssessmentRoutes = require("./assessmentRoutes");
```

Add near `router.use("/contact", ContactQueryRoutes...)`:

```js
router.use("/assessment", AssessmentRoutes); // AI Workforce Skills Assessment - public submission & admin lead management
```

- [ ] **Step 4: Start the server and smoke-test both public endpoints**

Run: `npm run dev` from `Viewebit-backend/` (leave running), then in another terminal:

```bash
curl -s http://localhost:3000/api/assessment/questions | node -e "
let data = '';
process.stdin.on('data', d => data += d);
process.stdin.on('end', () => {
  const json = JSON.parse(data);
  const sectionCount = json.data.sections.length;
  const questionOrRowCount = json.data.sections.reduce((sum, s) => sum + (s.matrix ? s.rows.length : s.questions.length), 0);
  if (json.success !== true || sectionCount !== 6 || questionOrRowCount !== 30) {
    console.error('FAIL: expected 6 sections and 30 total questions/rows, got', sectionCount, questionOrRowCount);
    process.exit(1);
  }
  console.log('PASS: GET /api/assessment/questions returns 6 sections, 30 questions total');
});
"
```

Expected: `PASS: GET /api/assessment/questions returns 6 sections, 30 questions total`.

Then submit a full test payload:

```bash
curl -s -X POST http://localhost:3000/api/assessment/submit \
  -H "Content-Type: application/json" \
  -d '{
    "leadInfo": {"first_name":"Test","last_name":"User","work_email":"test.user@example.co.uk","agency_name":"Example Recruitment","job_title":"Managing Director","employee_count_band":"11-50"},
    "answers": {"agency_type":"generalist","team_size":"6-15","ai_approach":"introducing","conf_prompting":3,"conf_research":3,"conf_jd":3,"conf_personalise":3,"conf_summarise":3,"conf_interview":3,"conf_analyse":3,"conf_verify":3,"conf_confidentiality":3,"conf_when_not":3,"freq_sourcing":3,"freq_screening":3,"freq_outreach":3,"freq_reporting":3,"use_cases":["candidate_research"],"effectiveness":3,"scn_screening":"B","scn_outreach":"B","scn_verify":"B","scn_client":"B","scn_confidential":"B","ready_leadership":3,"ready_process":3,"ready_skills":3,"ready_governance":3,"ready_measurement":3,"ready_adoption":3}
  }'
```

Expected: HTTP 201 JSON with `"success":true` and a `data.overallScore` in the 40-70 range (mid-scale answers). Note the returned `id` — used as manual spot-check evidence that a row landed in `assessment_leads` (`SELECT * FROM assessment_leads ORDER BY id DESC LIMIT 1;`). Stop the dev server once confirmed.

---

## Batch B — Frontend (`Viewebit-web`, branch `new-features`)

Can start as soon as Task 1's schema/response shapes are fixed (they're pinned above) — does not need to wait for Batch A to finish running.

### Task 5: API service + generic question renderer + intro page

**Files:**
- Create: `Viewebit-web/src/services/assessment.ts`
- Create: `Viewebit-web/src/pages/assessment/QuestionRenderer.tsx`
- Create: `Viewebit-web/src/pages/assessment/AssessmentIntroPage.tsx`

**Interfaces:**
- Consumes: existing `api` default export from `./api` (`Viewebit-web/src/services/api.ts`, baseURL already `${API_CONFIG.BASE_URL}/api`).
- Produces: `assessmentService.getQuestions()` and `assessmentService.submit(payload)`, plus the `AssessmentSchema`, `LeadInfo`, `AssessmentResult` TypeScript types Task 6 imports from `../../services/assessment`. `QuestionRenderer` component with props `{ section, answers, onAnswer }` that Task 6 renders per-section.

- [ ] **Step 1: Write the API service**

Create `Viewebit-web/src/services/assessment.ts`:

```ts
import api from './api';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  type: 'single-select' | 'multi-select' | 'scale-1-5';
  prompt: string;
  options?: QuestionOption[];
}

export interface MatrixRow {
  id: string;
  label: string;
}

export interface Section {
  id: string;
  title: string;
  matrix?: boolean;
  scaleType?: 'confidence-1-5' | 'frequency-5';
  rows?: MatrixRow[];
  questions?: Question[];
}

export interface LeadField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'single-select';
  required: boolean;
  options?: QuestionOption[];
}

export interface AssessmentSchema {
  sections: Section[];
  leadFields: LeadField[];
}

export interface LeadInfo {
  first_name: string;
  last_name: string;
  work_email: string;
  agency_name: string;
  job_title: string;
  employee_count_band: string;
  phone?: string;
}

export type AnswerValue = string | number | string[];
export type AnswersMap = Record<string, AnswerValue>;

export interface DimensionScores {
  aiFluency: number;
  workflowApplication: number;
  prompting: number;
  responsibleAI: number;
  organisationalReadiness: number;
}

export interface OpportunityOrGap {
  key: string;
  title: string;
  explanation: string;
}

export interface AssessmentResult {
  id: number;
  overallScore: number;
  maturityLevel: string;
  maturityLabel: string;
  maturityDescription: string;
  dimensionScores: DimensionScores;
  topOpportunities: OpportunityOrGap[];
  topGaps: OpportunityOrGap[];
  recommendedPriorities: string[];
}

export const assessmentService = {
  getQuestions: async (): Promise<AssessmentSchema> => {
    const response = await api.get('/assessment/questions');
    return response.data.data;
  },

  submit: async (leadInfo: LeadInfo, answers: AnswersMap): Promise<AssessmentResult> => {
    const response = await api.post('/assessment/submit', { leadInfo, answers });
    return response.data.data;
  }
};
```

- [ ] **Step 2: Write the generic question renderer**

Create `Viewebit-web/src/pages/assessment/QuestionRenderer.tsx`:

```tsx
import React from 'react';
import type { Section, AnswersMap, AnswerValue } from '../../services/assessment';

const SCALE_LABELS: Record<string, string[]> = {
  'confidence-1-5': ['Not confident', 'Slightly confident', 'Moderately confident', 'Very confident', 'Highly confident'],
  'frequency-5': ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often']
};

interface QuestionRendererProps {
  section: Section;
  answers: AnswersMap;
  onAnswer: (questionId: string, value: AnswerValue) => void;
}

const OptionButton: React.FC<{ selected: boolean; label: string; onClick: () => void }> = ({ selected, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
      selected
        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-medium'
        : 'border-gray-200 bg-white hover:border-indigo-300 text-gray-800'
    }`}
  >
    {label}
  </button>
);

const ScaleRow: React.FC<{
  rowId: string;
  label: string;
  scaleType: string;
  value: AnswerValue | undefined;
  onAnswer: (questionId: string, value: AnswerValue) => void;
}> = ({ rowId, label, scaleType, value, onAnswer }) => {
  const labels = SCALE_LABELS[scaleType] || SCALE_LABELS['confidence-1-5'];
  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <p className="text-sm font-medium text-gray-800 mb-3">{label}</p>
      <div className="flex gap-2">
        {labels.map((scaleLabel, index) => {
          const scaleValue = index + 1;
          const selected = Number(value) === scaleValue;
          return (
            <button
              key={scaleValue}
              type="button"
              title={scaleLabel}
              onClick={() => onAnswer(rowId, scaleValue)}
              className={`flex-1 py-2 rounded-md text-xs font-medium border transition-colors ${
                selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
              }`}
            >
              {scaleValue}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const QuestionRenderer: React.FC<QuestionRendererProps> = ({ section, answers, onAnswer }) => {
  if (section.matrix && section.rows) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{section.title}</h2>
        <p className="text-sm text-gray-500 mb-4">Rate each item, then continue.</p>
        <div>
          {section.rows.map((row) => (
            <ScaleRow
              key={row.id}
              rowId={row.id}
              label={row.label}
              scaleType={section.scaleType || 'confidence-1-5'}
              value={answers[row.id]}
              onAnswer={onAnswer}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!section.questions) return null;

  return (
    <div className="space-y-8">
      {section.questions.map((question) => {
        const value = answers[question.id];

        if (question.type === 'scale-1-5') {
          return (
            <div key={question.id}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{question.prompt}</h2>
              <ScaleRow rowId={question.id} label="" scaleType="confidence-1-5" value={value} onAnswer={onAnswer} />
            </div>
          );
        }

        if (question.type === 'multi-select') {
          const selected = Array.isArray(value) ? (value as string[]) : [];
          return (
            <div key={question.id}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{question.prompt}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {question.options?.map((opt) => {
                  const isSelected = selected.includes(opt.value);
                  return (
                    <OptionButton
                      key={opt.value}
                      selected={isSelected}
                      label={opt.label}
                      onClick={() => {
                        const next = isSelected ? selected.filter((v) => v !== opt.value) : [...selected, opt.value];
                        onAnswer(question.id, next);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div key={question.id}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{question.prompt}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {question.options?.map((opt) => (
                <OptionButton
                  key={opt.value}
                  selected={value === opt.value}
                  label={opt.label}
                  onClick={() => onAnswer(question.id, opt.value)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuestionRenderer;
```

- [ ] **Step 3: Write the intro page**

Create `Viewebit-web/src/pages/assessment/AssessmentIntroPage.tsx`:

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const AssessmentIntroPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <span className="inline-block text-xs font-semibold tracking-wide uppercase text-indigo-600 bg-indigo-50 rounded-full px-3 py-1 mb-4">
        For UK Recruitment Agencies
      </span>
      <h1 className="text-4xl font-bold text-gray-900 mb-3">AI Workforce Skills Assessment</h1>
      <p className="text-lg text-gray-600 mb-6">
        Discover where your recruitment team can use AI &mdash; and what skills they need to get there.
      </p>
      <p className="text-gray-700 mb-2">A practical 5&ndash;7 minute assessment for UK recruitment agencies.</p>
      <p className="font-medium text-indigo-700 mb-8">No technical knowledge required.</p>
      <button
        type="button"
        onClick={() => navigate('/ai-workforce-assessment/start')}
        className="inline-flex items-center px-8 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
      >
        Start Assessment
      </button>
    </div>
  );
};

export default AssessmentIntroPage;
```

- [ ] **Step 4: Build check**

Run: `npm run build` from `Viewebit-web/`
Expected: build completes with no TypeScript errors referencing `services/assessment.ts`, `QuestionRenderer.tsx`, or `AssessmentIntroPage.tsx`. (Unused-file warnings are fine at this point since nothing imports these yet — Task 6 wires them in.)

---

### Task 6: Wizard page + results page + route wiring

**Files:**
- Create: `Viewebit-web/src/pages/assessment/AssessmentWizardPage.tsx`
- Create: `Viewebit-web/src/pages/assessment/AssessmentResultsPage.tsx`
- Modify: `Viewebit-web/src/App.tsx`

**Interfaces:**
- Consumes: `assessmentService`, `AssessmentSchema`, `LeadInfo`, `AssessmentResult`, `AnswersMap`, `AnswerValue` from `../../services/assessment` (Task 5); `QuestionRenderer` from `./QuestionRenderer` (Task 5); `AssessmentIntroPage` from `./AssessmentIntroPage` (Task 5).
- Produces: routes `/ai-workforce-assessment` (intro, inside `PublicLayout`), `/ai-workforce-assessment/start` (wizard, standalone), `/ai-workforce-assessment/results` (results, standalone) registered in `App.tsx`.

- [ ] **Step 1: Write the wizard page**

Create `Viewebit-web/src/pages/assessment/AssessmentWizardPage.tsx`:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  assessmentService,
  type AssessmentSchema,
  type AnswersMap,
  type AnswerValue,
  type LeadInfo
} from '../../services/assessment';
import QuestionRenderer from './QuestionRenderer';

const LEAD_CAPTURE_AFTER_SECTION = 'use_case_maturity';

const AssessmentWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [schema, setSchema] = useState<AssessmentSchema | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [leadInfo, setLeadInfo] = useState<Partial<LeadInfo>>({});
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useMemo(() => Date.now(), []);

  useEffect(() => {
    assessmentService.getQuestions()
      .then(setSchema)
      .catch(() => toast.error('Could not load the assessment. Please refresh and try again.'));
  }, []);

  if (!schema) {
    return <div className="max-w-2xl mx-auto px-4 py-24 text-center text-gray-500">Loading assessment&hellip;</div>;
  }

  const totalQuestions = schema.sections.reduce(
    (sum, s) => sum + (s.matrix && s.rows ? s.rows.length : s.questions?.length || 0),
    0
  );
  const questionsBeforeCurrentSection = schema.sections
    .slice(0, stepIndex)
    .reduce((sum, s) => sum + (s.matrix && s.rows ? s.rows.length : s.questions?.length || 0), 0);
  const currentSection = schema.sections[stepIndex];
  const currentSectionSize = currentSection.matrix && currentSection.rows ? currentSection.rows.length : currentSection.questions?.length || 0;
  const answeredSoFar = questionsBeforeCurrentSection + currentSectionSize;
  const progressPercent = Math.round((answeredSoFar / totalQuestions) * 100);

  const elapsedMinutes = (Date.now() - startedAt) / 60000;
  const paceMinutesPerQuestion = answeredSoFar > 0 ? elapsedMinutes / answeredSoFar : 0.2;
  const remainingQuestions = totalQuestions - answeredSoFar;
  const estimatedMinutesRemaining = Math.max(1, Math.round(remainingQuestions * paceMinutesPerQuestion));

  const handleAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isCurrentSectionComplete = () => {
    if (currentSection.matrix && currentSection.rows) {
      return currentSection.rows.every((row) => answers[row.id] !== undefined);
    }
    return (currentSection.questions || []).every((q) => {
      const value = answers[q.id];
      if (q.type === 'multi-select') return Array.isArray(value) && value.length > 0;
      return value !== undefined && value !== '';
    });
  };

  const handleContinue = () => {
    if (!isCurrentSectionComplete()) {
      toast.error('Please answer every question on this screen before continuing.');
      return;
    }
    if (currentSection.id === LEAD_CAPTURE_AFTER_SECTION && !showLeadCapture) {
      setShowLeadCapture(true);
      return;
    }
    setShowLeadCapture(false);
    if (stepIndex < schema.sections.length - 1) {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (showLeadCapture) {
      setShowLeadCapture(false);
      return;
    }
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const isLeadInfoComplete = () =>
    !!(leadInfo.first_name && leadInfo.last_name && leadInfo.work_email && leadInfo.agency_name && leadInfo.job_title && leadInfo.employee_count_band);

  const handleLeadCaptureContinue = () => {
    if (!isLeadInfoComplete()) {
      toast.error('Please fill in every required field.');
      return;
    }
    setShowLeadCapture(false);
    setStepIndex((i) => i + 1);
  };

  const handleSubmit = async () => {
    if (!isCurrentSectionComplete()) {
      toast.error('Please answer every question on this screen before finishing.');
      return;
    }
    if (!isLeadInfoComplete()) {
      toast.error('We are missing some of your details. Please go back and fill them in.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await assessmentService.submit(leadInfo as LeadInfo, answers);
      sessionStorage.setItem('assessment_result', JSON.stringify(result));
      navigate('/ai-workforce-assessment/results');
    } catch {
      toast.error('Something went wrong submitting your assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastSection = stepIndex === schema.sections.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Question {Math.min(answeredSoFar, totalQuestions)} of {totalQuestions}</span>
            <span>Estimated time remaining: {estimatedMinutesRemaining} minute{estimatedMinutesRemaining === 1 ? '' : 's'}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {showLeadCapture ? (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Where should we send your AI Workforce Skills Report?</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your information is used to provide your assessment results and relevant Viewebit follow-up.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  className="border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="First name"
                  value={leadInfo.first_name || ''}
                  onChange={(e) => setLeadInfo((p) => ({ ...p, first_name: e.target.value }))}
                />
                <input
                  className="border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Last name"
                  value={leadInfo.last_name || ''}
                  onChange={(e) => setLeadInfo((p) => ({ ...p, last_name: e.target.value }))}
                />
                <input
                  className="border border-gray-200 rounded-lg px-3 py-2 sm:col-span-2"
                  placeholder="Work email"
                  type="email"
                  value={leadInfo.work_email || ''}
                  onChange={(e) => setLeadInfo((p) => ({ ...p, work_email: e.target.value }))}
                />
                <input
                  className="border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Agency name"
                  value={leadInfo.agency_name || ''}
                  onChange={(e) => setLeadInfo((p) => ({ ...p, agency_name: e.target.value }))}
                />
                <input
                  className="border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Job title"
                  value={leadInfo.job_title || ''}
                  onChange={(e) => setLeadInfo((p) => ({ ...p, job_title: e.target.value }))}
                />
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2"
                  value={leadInfo.employee_count_band || ''}
                  onChange={(e) => setLeadInfo((p) => ({ ...p, employee_count_band: e.target.value }))}
                >
                  <option value="">Number of employees</option>
                  {schema.leadFields.find((f) => f.id === 'employee_count_band')?.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  className="border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Phone number (optional)"
                  value={leadInfo.phone || ''}
                  onChange={(e) => setLeadInfo((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <QuestionRenderer section={currentSection} answers={answers} onAnswer={handleAnswer} />
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0 && !showLeadCapture}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40"
          >
            Back
          </button>
          {showLeadCapture ? (
            <button
              type="button"
              onClick={handleLeadCaptureContinue}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            >
              Continue
            </button>
          ) : isLastSection ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'See My Results'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleContinue}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentWizardPage;
```

- [ ] **Step 2: Write the results page**

Create `Viewebit-web/src/pages/assessment/AssessmentResultsPage.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AssessmentResult } from '../../services/assessment';

const DIMENSION_LABELS: Record<string, string> = {
  aiFluency: 'AI Fluency',
  workflowApplication: 'Recruitment Workflow Application',
  prompting: 'Prompting & AI Communication',
  responsibleAI: 'Responsible AI & Human Oversight',
  organisationalReadiness: 'Organisational AI Readiness'
};

const AssessmentResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('assessment_result');
    if (!stored) {
      navigate('/ai-workforce-assessment');
      return;
    }
    setResult(JSON.parse(stored));
  }, [navigate]);

  if (!result) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">Your AI Workforce Readiness Snapshot</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center mb-8">
          <p className="text-sm uppercase tracking-wide text-gray-500 mb-2">Overall AI Workforce Readiness</p>
          <div className="text-6xl font-bold text-indigo-600 mb-2">{result.overallScore}<span className="text-2xl text-gray-400"> / 100</span></div>
          <p className="text-xl font-semibold text-gray-900 mb-3">{result.maturityLabel}</p>
          <p className="text-gray-600 max-w-xl mx-auto">{result.maturityDescription}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Capability Profile</h2>
          <div className="space-y-4">
            {Object.entries(result.dimensionScores).map(([key, score]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{DIMENSION_LABELS[key] || key}</span>
                  <span className="text-gray-500">{score}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Where AI Could Create the Most Value</h2>
          <div className="space-y-4">
            {result.topOpportunities.map((o) => (
              <div key={o.key}>
                <p className="font-semibold text-gray-900">{o.title}</p>
                <p className="text-sm text-gray-600">{o.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Biggest Workforce Skill Gaps</h2>
          <div className="space-y-4">
            {result.topGaps.map((g) => (
              <div key={g.key}>
                <p className="font-semibold text-gray-900">{g.title}</p>
                <p className="text-sm text-gray-600">{g.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-indigo-600 rounded-xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Your next step isn&apos;t &ldquo;more AI&rdquo;.</h2>
          <p className="text-lg font-medium mb-3">It&apos;s the right AI skills for your workforce.</p>
          <p className="text-indigo-100 max-w-xl mx-auto mb-6">
            Viewebit&apos;s AI Workforce Academy helps organisations identify the AI skills their teams actually need,
            build practical capability through targeted training, and measure adoption over time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/contact" className="px-6 py-3 rounded-lg bg-white text-indigo-700 font-semibold hover:bg-indigo-50">
              Talk to Viewebit about your AI Workforce Roadmap
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-6 py-3 rounded-lg border border-white text-white font-semibold hover:bg-indigo-500"
            >
              Download My Assessment Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultsPage;
```

- [ ] **Step 3: Wire the routes into `App.tsx`**

Modify `Viewebit-web/src/App.tsx`:

Add imports near the other page imports:

```tsx
import AssessmentIntroPage from './pages/assessment/AssessmentIntroPage';
import AssessmentWizardPage from './pages/assessment/AssessmentWizardPage';
import AssessmentResultsPage from './pages/assessment/AssessmentResultsPage';
```

Add a route inside the existing `<Route element={<PublicLayout />}>` block (next to `<Route path="/contact" element={<ContactPage />} />`):

```tsx
<Route path="/ai-workforce-assessment" element={<AssessmentIntroPage />} />
```

Add these as standalone top-level routes, next to `<Route path="/app-coming-soon" element={<AppComingSoonPage />} />` (outside any layout, so no nav/footer and no auth requirement):

```tsx
<Route path="/ai-workforce-assessment/start" element={<AssessmentWizardPage />} />
<Route path="/ai-workforce-assessment/results" element={<AssessmentResultsPage />} />
```

- [ ] **Step 4: Build check**

Run: `npm run build` from `Viewebit-web/`
Expected: build completes with no errors. Run `npm run lint` too and confirm no new lint errors in the `pages/assessment/` files or `App.tsx`.

---

## Batch C — AdminPanel (`Viewebit-AdminPanel`, branch `new-features`)

Can start in parallel with Batch A/B — the endpoint contract (`/assessment/admin/leads*`) is pinned above.

### Task 7: API service + list page

**Files:**
- Create: `Viewebit-AdminPanel/src/services/assessments.ts`
- Create: `Viewebit-AdminPanel/src/pages/AssessmentsPage.tsx`

**Interfaces:**
- Consumes: existing `api` default export from `./api` (`Viewebit-AdminPanel/src/services/api.ts`, `baseURL = import.meta.env.VITE_API_URL` which already includes `/api`).
- Produces: `assessmentService.{getAllLeads, getLeadById, updateLeadStatus, getStats}` and the `AssessmentLead`, `AssessmentListResponse` types Task 8 imports from `../../services/assessments`.

- [ ] **Step 1: Write the API service**

Create `Viewebit-AdminPanel/src/services/assessments.ts`:

```ts
import api from './api';

export interface DimensionScores {
  aiFluency: number;
  workflowApplication: number;
  prompting: number;
  responsibleAI: number;
  organisationalReadiness: number;
}

export interface OpportunityOrGap {
  key: string;
  title: string;
  explanation: string;
}

export interface AssessmentLead {
  id: number;
  first_name: string;
  last_name: string;
  work_email: string;
  agency_name: string;
  job_title: string;
  employee_count_band: string;
  phone?: string;
  agency_type: string;
  current_ai_approach: string;
  answers: Record<string, unknown>;
  overall_score: number;
  maturity_level: 'ai_explorer' | 'early_adopter' | 'developing' | 'ai_ready' | 'ai_enabled';
  dimension_scores: DimensionScores;
  top_opportunities: OpportunityOrGap[];
  top_gaps: OpportunityOrGap[];
  recommended_priorities: string[];
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'closed';
  admin_notes?: string;
  contacted_at?: string;
  contacted_by?: number;
  email_sent: boolean;
  email_sent_at?: string;
  created_at: string;
  updated_at: string;
  contactedByAdmin?: { id: number; name: string; email: string };
}

export interface AssessmentListResponse {
  success: boolean;
  data: {
    leads: AssessmentLead[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    stats: { total: number; new: number; contacted: number; qualified: number };
  };
}

export interface AssessmentStatsResponse {
  success: boolean;
  data: {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    unqualified: number;
    closed: number;
    todayCount: number;
    weekCount: number;
    recentLeads: Array<{
      id: number;
      first_name: string;
      last_name: string;
      agency_name: string;
      overall_score: number;
      maturity_level: string;
      status: string;
      created_at: string;
    }>;
  };
}

export interface UpdateLeadStatusData {
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'closed';
  admin_notes?: string;
}

export const assessmentService = {
  getAllLeads: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<AssessmentListResponse> => {
    const response = await api.get('/assessment/admin/leads', { params });
    return response.data;
  },

  getLeadById: async (id: number): Promise<AssessmentLead> => {
    const response = await api.get(`/assessment/admin/leads/${id}`);
    return response.data.data;
  },

  updateLeadStatus: async (id: number, data: UpdateLeadStatusData): Promise<AssessmentLead> => {
    const response = await api.patch(`/assessment/admin/leads/${id}/status`, data);
    return response.data.data;
  },

  getStats: async (): Promise<AssessmentStatsResponse> => {
    const response = await api.get('/assessment/admin/leads/stats');
    return response.data;
  }
};
```

- [ ] **Step 2: Write the list page**

Create `Viewebit-AdminPanel/src/pages/AssessmentsPage.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { assessmentService, type AssessmentLead } from '../services/assessments';
import AssessmentDetailModal from '../components/assessments/AssessmentDetailModal';

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  unqualified: 'Unqualified',
  closed: 'Closed'
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  qualified: 'bg-green-100 text-green-700',
  unqualified: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-200 text-gray-500'
};

const AssessmentsPage: React.FC = () => {
  const [leads, setLeads] = useState<AssessmentLead[]>([]);
  const [stats, setStats] = useState<{ total: number; new: number; contacted: number; qualified: number } | null>(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getAllLeads({ page, limit: 20, status, search });
      setLeads(res.data.leads);
      setStats(res.data.stats);
      setTotalPages(res.data.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Assessment Leads</h1>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">New</p>
            <p className="text-2xl font-bold">{stats.new}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Contacted</p>
            <p className="text-2xl font-bold">{stats.contacted}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Qualified</p>
            <p className="text-2xl font-bold">{stats.qualified}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Search name, email, agency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium">Search</button>
        </form>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Maturity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No assessment leads yet.</td></tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedId(lead.id)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.first_name} {lead.last_name}</td>
                  <td className="px-4 py-3">{lead.agency_name}</td>
                  <td className="px-4 py-3">{lead.overall_score}</td>
                  <td className="px-4 py-3">{lead.maturity_level.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(lead.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {selectedId && (
        <AssessmentDetailModal
          leadId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => { setSelectedId(null); load(); }}
        />
      )}
    </div>
  );
};

export default AssessmentsPage;
```

- [ ] **Step 3: Build check**

Run: `npm run build` from `Viewebit-AdminPanel/`
Expected: fails only on the missing `../components/assessments/AssessmentDetailModal` import (created in Task 8) — confirm the error is exactly that missing module and nothing else (no type errors in the files just written).

---

### Task 8: Detail modal + nav wiring

**Files:**
- Create: `Viewebit-AdminPanel/src/components/assessments/AssessmentDetailModal.tsx`
- Modify: `Viewebit-AdminPanel/src/App.tsx`
- Modify: `Viewebit-AdminPanel/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `assessmentService`, `AssessmentLead` from `../../services/assessments` (Task 7).
- Produces: `AssessmentDetailModal` component with props `{ leadId: number; onClose: () => void; onUpdated: () => void }`, imported by `AssessmentsPage.tsx` (Task 7 — already written to expect this exact prop shape).

- [ ] **Step 1: Write the detail modal**

Create `Viewebit-AdminPanel/src/components/assessments/AssessmentDetailModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { assessmentService, type AssessmentLead, type UpdateLeadStatusData } from '../../services/assessments';

interface AssessmentDetailModalProps {
  leadId: number;
  onClose: () => void;
  onUpdated: () => void;
}

const DIMENSION_LABELS: Record<string, string> = {
  aiFluency: 'AI Fluency',
  workflowApplication: 'Workflow Application',
  prompting: 'Prompting',
  responsibleAI: 'Responsible AI',
  organisationalReadiness: 'Organisational Readiness'
};

const AssessmentDetailModal: React.FC<AssessmentDetailModalProps> = ({ leadId, onClose, onUpdated }) => {
  const [lead, setLead] = useState<AssessmentLead | null>(null);
  const [status, setStatus] = useState<UpdateLeadStatusData['status']>('new');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRawAnswers, setShowRawAnswers] = useState(false);

  useEffect(() => {
    assessmentService.getLeadById(leadId).then((data) => {
      setLead(data);
      setStatus(data.status);
      setNotes(data.admin_notes || '');
    });
  }, [leadId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await assessmentService.updateLeadStatus(leadId, { status, admin_notes: notes });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {!lead ? (
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h2>
                <p className="text-sm text-gray-500">{lead.job_title} at {lead.agency_name}</p>
              </div>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-6">
              <div><span className="text-gray-500">Work email:</span> {lead.work_email}</div>
              <div><span className="text-gray-500">Phone:</span> {lead.phone || '—'}</div>
              <div><span className="text-gray-500">Agency type:</span> {lead.agency_type}</div>
              <div><span className="text-gray-500">Employees:</span> {lead.employee_count_band}</div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4 text-center mb-6">
              <div className="text-3xl font-bold text-indigo-700">{lead.overall_score} / 100</div>
              <div className="text-sm font-medium text-indigo-900">{lead.maturity_level.replace('_', ' ')}</div>
            </div>

            <h3 className="font-semibold text-gray-900 mb-2">Capability Profile</h3>
            <div className="space-y-2 mb-6">
              {Object.entries(lead.dimension_scores).map(([key, score]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600">{DIMENSION_LABELS[key] || key}</span>
                  <span className="font-medium">{score}</span>
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-gray-900 mb-2">Top Opportunities</h3>
            <ul className="text-sm text-gray-700 mb-6 list-disc pl-5 space-y-1">
              {lead.top_opportunities.map((o) => <li key={o.key}><strong>{o.title}</strong> — {o.explanation}</li>)}
            </ul>

            <h3 className="font-semibold text-gray-900 mb-2">Top Skill Gaps</h3>
            <ul className="text-sm text-gray-700 mb-6 list-disc pl-5 space-y-1">
              {lead.top_gaps.map((g) => <li key={g.key}><strong>{g.title}</strong> — {g.explanation}</li>)}
            </ul>

            <button
              type="button"
              className="text-sm text-indigo-600 mb-6"
              onClick={() => setShowRawAnswers((v) => !v)}
            >
              {showRawAnswers ? 'Hide raw answers' : 'Show raw answers'}
            </button>
            {showRawAnswers && (
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto mb-6">
                {JSON.stringify(lead.answers, null, 2)}
              </pre>
            )}

            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
                value={status}
                onChange={(e) => setStatus(e.target.value as UpdateLeadStatusData['status'])}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="unqualified">Unqualified</option>
                <option value="closed">Closed</option>
              </select>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin notes</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AssessmentDetailModal;
```

- [ ] **Step 2: Wire the route**

Modify `Viewebit-AdminPanel/src/App.tsx`:

Add an import near `import QueriesPage from './pages/QueriesPage';`:

```tsx
import AssessmentsPage from './pages/AssessmentsPage';
```

Add a route next to the existing `queries` route:

```tsx
<Route path="assessments" element={
  <ProtectedRoute>
    <AssessmentsPage />
  </ProtectedRoute>
} />
```

- [ ] **Step 3: Wire the sidebar nav entry**

Modify `Viewebit-AdminPanel/src/components/layout/Sidebar.tsx`:

Add `ClipboardList` to the existing icon import block at the top of the file (alongside `MessageSquare`, `Building2`, etc.).

Add a nav entry next to `{ name: 'User Queries', href: '/queries', icon: MessageSquare },`:

```tsx
{ name: 'Assessment Leads', href: '/assessments', icon: ClipboardList },
```

- [ ] **Step 4: Build check**

Run: `npm run build` from `Viewebit-AdminPanel/`
Expected: build completes with no errors. Run `npm run lint` too and confirm no new lint errors in `AssessmentsPage.tsx`, `AssessmentDetailModal.tsx`, `App.tsx`, or `Sidebar.tsx`.

---

## Final integration check (after all 8 tasks)

- [ ] **Step 1: End-to-end manual pass**

With the backend dev server running (`npm run dev` in `Viewebit-backend/`) and the web frontend running (`npm run dev` in `Viewebit-web/`), the user will manually visit `/ai-workforce-assessment` in a browser, complete the flow, and confirm: the wizard progresses through all 6 sections, the lead-capture step appears after the "AI Use-Case Maturity" section, submission lands on the results page with a real score, and the row appears in `Viewebit-AdminPanel`'s new "Assessment Leads" screen (`npm run dev` in `Viewebit-AdminPanel/`) with matching data. This step is explicitly for the user to run themselves — no `claude-in-chrome` automation.
