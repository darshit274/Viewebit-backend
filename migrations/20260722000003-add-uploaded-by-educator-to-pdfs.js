'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('pdfs');
    if (!tableDescription.uploaded_by_educator_id) {
      await queryInterface.addColumn('pdfs', 'uploaded_by_educator_id', {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'educators',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('pdfs');
    if (tableDescription.uploaded_by_educator_id) {
      await queryInterface.removeColumn('pdfs', 'uploaded_by_educator_id');
    }
  }
};
