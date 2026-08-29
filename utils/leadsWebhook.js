'use strict';

// Sends completed assessment leads to the Viewebit CRM. Payload shape and
// field names are the CRM's finalized contract (2026-08-29) - the CRM maps
// our natural field names onto its own columns internally, and anything
// without a matching column goes under custom_fields (its JSON catch-all).
// `source` is not sent - the CRM auto-tags leads from this origin itself.

function mapLeadToWebhookPayload(lead) {
  const payload = {
    first_name: lead.first_name,
    last_name: lead.last_name,
    work_email: lead.work_email,
    agency_name: lead.agency_name,
    job_title: lead.job_title,
    overall_score: lead.overall_score,
    custom_fields: {
      employee_count_band: lead.employee_count_band,
      agency_type: lead.agency_type,
      maturity_level: lead.maturity_level,
      dimension_scores: lead.dimension_scores,
      top_opportunities: lead.top_opportunities,
      top_gaps: lead.top_gaps,
      recommended_priorities: lead.recommended_priorities,
      completed_at: lead.completed_at
    }
  };

  if (lead.phone) payload.phone = lead.phone;

  return payload;
}

async function sendLeadToWebhook(lead) {
  const url = process.env.LEADS_WEBHOOK_URL;
  const secret = process.env.LEADS_WEBHOOK_SECRET;

  if (!url || !secret) {
    throw new Error('CRM webhook is not configured - set LEADS_WEBHOOK_URL and LEADS_WEBHOOK_SECRET');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': secret
    },
    body: JSON.stringify(mapLeadToWebhookPayload(lead))
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`CRM webhook responded ${response.status}: ${body.slice(0, 500)}`);
  }
}

module.exports = { mapLeadToWebhookPayload, sendLeadToWebhook };
