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
