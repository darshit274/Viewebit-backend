'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'current_session_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      defaultValue: null,
      after: 'subscription_expiry_reminder_sent'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'current_session_id');
  }
};
