'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('new_test_series', 'validity_days', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 365, // Default 1 year validity
      comment: 'Number of days the course is valid after purchase'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('new_test_series', 'validity_days');
  }
};
