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
