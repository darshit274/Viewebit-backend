'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add category_id to questions table for direct category-question relationship
    await queryInterface.addColumn('questions', 'category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Direct link to category for simplified hierarchy'
    });

    await queryInterface.addColumn('questions', 'display_order', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Order for display within category'
    });

    // Add index for performance
    await queryInterface.addIndex('questions', ['category_id'], {
      name: 'idx_questions_category'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove index
    await queryInterface.removeIndex('questions', 'idx_questions_category');

    // Remove columns
    await queryInterface.removeColumn('questions', 'display_order');
    await queryInterface.removeColumn('questions', 'category_id');
  }
};
