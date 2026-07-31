'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');

    if (!table.is_anonymized) {
      await queryInterface.addColumn('users', 'is_anonymized', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!table.anonymized_at) {
      await queryInterface.addColumn('users', 'anonymized_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('users');
    if (table.anonymized_at) await queryInterface.removeColumn('users', 'anonymized_at');
    if (table.is_anonymized) await queryInterface.removeColumn('users', 'is_anonymized');
  }
};
