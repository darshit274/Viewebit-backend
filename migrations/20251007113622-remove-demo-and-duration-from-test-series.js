'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Remove demo_tests_count and subscription_duration_days from new_test_series
    // These fields are no longer needed as test configuration is now at category level
    await queryInterface.removeColumn('new_test_series', 'demo_tests_count');
    await queryInterface.removeColumn('new_test_series', 'subscription_duration_days');
  },

  async down (queryInterface, Sequelize) {
    // Restore columns if migration is rolled back
    await queryInterface.addColumn('new_test_series', 'demo_tests_count', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of demo/free tests available'
    });

    await queryInterface.addColumn('new_test_series', 'subscription_duration_days', {
      type: Sequelize.INTEGER,
      defaultValue: 365,
      allowNull: false,
      comment: 'Subscription validity in days'
    });
  }
};
