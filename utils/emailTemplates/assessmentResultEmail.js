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
