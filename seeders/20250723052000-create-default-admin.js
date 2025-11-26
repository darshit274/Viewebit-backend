'use strict';

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await queryInterface.bulkInsert('admins', [{
      id:  uuidv4(),
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      permissions: JSON.stringify({
        users: ['read', 'write', 'delete'],
        tests: ['read', 'write', 'delete'],
        analytics: ['read'],
        settings: ['read', 'write']
      }),
      created_at: new Date(),
      updated_at: new Date()
    }], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('admins', {
      email: process.env.ADMIN_EMAIL
    }, {});
  }
};