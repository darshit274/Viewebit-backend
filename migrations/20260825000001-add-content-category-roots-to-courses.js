'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('courses', 'pdf_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'pdf_categories', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Auto-created root PdfCategory for this course\'s inline PDF uploads'
    });
    await queryInterface.addColumn('courses', 'quiz_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'categories', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Auto-created root Category for this course\'s inline quiz creation'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('courses', 'pdf_category_id');
    await queryInterface.removeColumn('courses', 'quiz_category_id');
  }
};
