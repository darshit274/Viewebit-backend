'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('pdf_categories');
    if (!tableDescription.educator_id) {
      await queryInterface.addColumn('pdf_categories', 'educator_id', {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'educators',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addIndex('pdf_categories', ['educator_id'], { name: 'idx_pdf_categories_educator' });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('pdf_categories');
    if (tableDescription.educator_id) {
      await queryInterface.removeColumn('pdf_categories', 'educator_id');
    }
  }
};
