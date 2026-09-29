'use strict';

// One-off dev helper: mints a legitimately-signed educator JWT for a given
// educator email, without ever reading or touching that educator's
// password, purely for local API/browser verification.
require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../models');

const EDUCATOR_EMAIL = process.argv[2] || 'educator@viewebit.com';

async function run() {
  const educator = await db.Educator.findOne({ where: { email: EDUCATOR_EMAIL, isActive: true } });
  if (!educator) {
    console.error(`No active educator found for ${EDUCATOR_EMAIL}`);
    process.exit(1);
  }
  const sessionId = crypto.randomUUID();
  await educator.update({ current_session_id: sessionId });
  const token = jwt.sign({ id: educator.id, sessionId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  console.log(JSON.stringify({ token, educator: { id: educator.id, name: educator.name, email: educator.email } }));
  await db.sequelize.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
