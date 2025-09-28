'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add test duration column to categories table
    await queryInterface.addColumn('categories', 'test_duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 60,
      comment: 'Test duration in minutes for this category'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove test duration column from categories table
    await queryInterface.removeColumn('categories', 'test_duration_minutes');
  }
};
