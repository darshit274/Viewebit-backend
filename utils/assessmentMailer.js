'use strict';

const nodemailer = require('nodemailer');

// Dedicated mailer for the AI Workforce Skills Assessment results email.
//
// Kept separate from utils/verifyEmail.js on purpose: that shared sendMail()
// util is used across Auth/Admin/Educator OTP and password-reset flows and
// hardcodes its own account (NODMAILER_EMAIL/NODEMAILER_PASS via Gmail
// STARTTLS on port 587). The assessment results email needs to send from
// info@viewebit.com via a different, cPanel-hosted mailbox on port 465
// (implicit SSL/TLS, not STARTTLS) - a different enough transporter config
// that bolting it onto the shared util would risk breaking those other
// flows. This keeps the blast radius contained to just this feature.

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.ASSESSMENT_SMTP_HOST;
  const port = Number(process.env.ASSESSMENT_SMTP_PORT || 465);
  const user = process.env.ASSESSMENT_SMTP_EMAIL;
  const pass = process.env.ASSESSMENT_SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      'Assessment SMTP is not configured - set ASSESSMENT_SMTP_HOST, ASSESSMENT_SMTP_EMAIL and ASSESSMENT_SMTP_PASSWORD'
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit SSL/TLS; anything else (e.g. 587) = STARTTLS
    auth: { user, pass }
  });

  return cachedTransporter;
}

async function sendAssessmentResultEmail({ receiver, subject, htmlContent }) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Viewebit" <${process.env.ASSESSMENT_SMTP_EMAIL}>`,
    to: receiver,
    subject,
    html: htmlContent
  });
}

module.exports = { sendAssessmentResultEmail };
