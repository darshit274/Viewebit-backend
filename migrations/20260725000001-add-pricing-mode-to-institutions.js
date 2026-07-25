'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('institutions');
    if (!table.pricing_mode) {
      await queryInterface.addColumn('institutions', 'pricing_mode', {
        type: Sequelize.ENUM('school', 'private_educator', 'coaching_center'),
        allowNull: false,
        defaultValue: 'coaching_center'
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('institutions');
    if (table.pricing_mode) {
      await queryInterface.removeColumn('institutions', 'pricing_mode');
    }
  }
};
