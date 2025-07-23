'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await queryInterface.bulkInsert('admins', [{
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Super Admin',
      email: 'admin@mocktale.com',
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
      email: 'admin@mocktale.com'
    }, {});
  }
};