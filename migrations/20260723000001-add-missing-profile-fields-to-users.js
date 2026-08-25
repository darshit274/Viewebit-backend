'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');

    const columns = {
      fullName: { type: Sequelize.STRING, allowNull: true },
      phoneNumber: { type: Sequelize.STRING, allowNull: true },
      dateOfBirth: { type: Sequelize.DATEONLY, allowNull: true },
      schoolName: { type: Sequelize.STRING, allowNull: true },
      city: { type: Sequelize.STRING, allowNull: true },
      state: { type: Sequelize.STRING, allowNull: true },
      avatarUrl: { type: Sequelize.STRING, allowNull: true }
    };

    for (const [name, definition] of Object.entries(columns)) {
      if (!table[name]) {
        await queryInterface.addColumn('users', name, definition);
      }
    }
  },

  async down(queryInterface) {
    const columns = ['fullName', 'phoneNumber', 'dateOfBirth', 'schoolName', 'city', 'state', 'avatarUrl'];
    const table = await queryInterface.describeTable('users');
    for (const name of columns) {
      if (table[name]) {
        await queryInterface.removeColumn('users', name);
      }
    }
  }
};
