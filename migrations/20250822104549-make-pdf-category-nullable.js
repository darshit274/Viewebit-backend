'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Make category_id nullable to support course-based PDFs
    await queryInterface.changeColumn('pdfs', 'category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'pdf_categories',
        key: 'id'
      }
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert category_id back to non-nullable
    await queryInterface.changeColumn('pdfs', 'category_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'pdf_categories',
        key: 'id'
      }
    });
  }
};
