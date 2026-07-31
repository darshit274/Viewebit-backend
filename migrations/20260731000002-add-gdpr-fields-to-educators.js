'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('educators');

    if (!table.is_anonymized) {
      await queryInterface.addColumn('educators', 'is_anonymized', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!table.anonymized_at) {
      await queryInterface.addColumn('educators', 'anonymized_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('educators');
    if (table.anonymized_at) await queryInterface.removeColumn('educators', 'anonymized_at');
    if (table.is_anonymized) await queryInterface.removeColumn('educators', 'is_anonymized');
  }
};
