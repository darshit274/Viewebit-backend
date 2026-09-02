'use strict';

// One-off dev helper: mints a legitimately-signed admin JWT for the first
// active admin account, without ever reading or touching that admin's
// password, purely for local browser verification of admin-only UI.
require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../models');

async function run() {
  const admin = await db.Admin.findOne({ where: { isActive: true }, order: [['id', 'ASC']] });
  if (!admin) {
    console.error('No active admin found');
    process.exit(1);
  }
  const sessionId = crypto.randomUUID();
  await admin.update({ current_session_id: sessionId });
  const token = jwt.sign({ id: admin.id, sessionId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  console.log(JSON.stringify({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } }));
  await db.sequelize.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
