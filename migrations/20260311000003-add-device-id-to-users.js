'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'device_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      defaultValue: null,
      after: 'current_session_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'device_id');
  }
};
