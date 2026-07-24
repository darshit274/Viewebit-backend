'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('educators');

    const columns = {
      reset_otp: { type: Sequelize.STRING, allowNull: true },
      reset_otp_expiry: { type: Sequelize.DATE, allowNull: true },
      reset_token: { type: Sequelize.STRING, allowNull: true },
      reset_token_expiry: { type: Sequelize.DATE, allowNull: true }
    };

    for (const [name, definition] of Object.entries(columns)) {
      if (!table[name]) {
        await queryInterface.addColumn('educators', name, definition);
      }
    }
  },

  async down(queryInterface) {
    const columns = ['reset_otp', 'reset_otp_expiry', 'reset_token', 'reset_token_expiry'];
    const table = await queryInterface.describeTable('educators');
    for (const name of columns) {
      if (table[name]) {
        await queryInterface.removeColumn('educators', name);
      }
    }
  }
};
