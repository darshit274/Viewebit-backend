'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('admins', 'current_session_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      defaultValue: null,
      after: 'otpExpiry'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('admins', 'current_session_id');
  }
};
