'use strict';

const crypto = require('crypto');

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a || '', 'utf8');
  const bufB = Buffer.from(b || '', 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Machine-to-machine auth for endpoints called by external systems (the CRM
// backfill puller) rather than a logged-in admin - checks a static API key
// with a constant-time compare, same security bar the CRM uses for our
// incoming webhook secret.
function requireApiKey(envVarName) {
  return (req, res, next) => {
    const expected = process.env[envVarName];
    const provided = req.headers['x-api-key'];

    if (!expected || !provided || !timingSafeEqual(provided, expected)) {
      return res.status(401).json({ success: false, message: 'Invalid or missing API key' });
    }

    next();
  };
}

module.exports = { requireApiKey, timingSafeEqual };
