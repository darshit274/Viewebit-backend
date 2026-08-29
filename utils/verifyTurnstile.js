'use strict';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Verifies a Cloudflare Turnstile token server-side. A client-side-only
// check can't be trusted - a bot never runs the widget's JS at all and can
// just omit or fake the token, so this call is the actual gate.
async function verifyTurnstileToken(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { success: false, errorCodes: ['not-configured'] };
  }
  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const params = new URLSearchParams();
  params.append('secret', secret);
  params.append('response', token);
  if (remoteIp) params.append('remoteip', remoteIp);

  const response = await fetch(SITEVERIFY_URL, { method: 'POST', body: params });
  const data = await response.json();

  return { success: !!data.success, errorCodes: data['error-codes'] || [] };
}

module.exports = { verifyTurnstileToken };
