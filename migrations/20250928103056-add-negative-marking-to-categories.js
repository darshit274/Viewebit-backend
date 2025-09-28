'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add negative marking columns to categories table
    await queryInterface.addColumn('categories', 'negative_marking_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether negative marking is enabled for wrong answers in this category'
    });

    await queryInterface.addColumn('categories', 'negative_marks_per_wrong', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.25,
      comment: 'Number of marks to deduct for each wrong answer'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove negative marking columns from categories table
    await queryInterface.removeColumn('categories', 'negative_marking_enabled');
    await queryInterface.removeColumn('categories', 'negative_marks_per_wrong');
  }
};
