'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('categories');
    if (!tableDescription.educator_id) {
      await queryInterface.addColumn('categories', 'educator_id', {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'educators',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addIndex('categories', ['educator_id'], { name: 'idx_categories_educator' });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('categories');
    if (tableDescription.educator_id) {
      await queryInterface.removeColumn('categories', 'educator_id');
    }
  }
};
