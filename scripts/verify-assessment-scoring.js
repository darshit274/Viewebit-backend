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
