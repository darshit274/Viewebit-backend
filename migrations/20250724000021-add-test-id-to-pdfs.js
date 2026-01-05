'use strict';

/**
 * Adds nullable `test_id` (UUID) to `pdfs` so that legacy queries selecting this column succeed.
 * It is optional and references `test.id` with ON UPDATE/DELETE SET NULL.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pdfs', 'test_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'test',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Legacy link to individual test (optional)'
    });

    await queryInterface.addIndex('pdfs', ['test_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('pdfs', ['test_id']);
    await queryInterface.removeColumn('pdfs', 'test_id');
  }
};
