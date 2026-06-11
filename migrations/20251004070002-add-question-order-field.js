'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('questions', 'question_order', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Order of question from Excel import or manual creation'
    });

    // Add index for better performance when ordering
    await queryInterface.addIndex('questions', ['category_id', 'question_order'], {
      name: 'idx_questions_category_order'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('questions', 'idx_questions_category_order');
    await queryInterface.removeColumn('questions', 'question_order');
  }
};
