'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('new_test_series');
    if (!tableDescription.educator_id) {
      await queryInterface.addColumn('new_test_series', 'educator_id', {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'educators',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addIndex('new_test_series', ['educator_id'], { name: 'idx_test_series_educator' });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('new_test_series');
    if (tableDescription.educator_id) {
      await queryInterface.removeColumn('new_test_series', 'educator_id');
    }
  }
};
