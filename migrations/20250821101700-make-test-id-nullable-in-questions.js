'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Make test_id nullable for simplified hierarchy system
    await queryInterface.changeColumn('questions', 'test_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tests',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert test_id to not nullable
    await queryInterface.changeColumn('questions', 'test_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'tests',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  }
};