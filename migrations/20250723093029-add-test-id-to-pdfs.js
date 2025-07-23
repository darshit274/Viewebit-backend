'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add test_id column without foreign key constraint for now
    await queryInterface.addColumn('pdfs', 'test_id', {
      type: Sequelize.UUID,
      allowNull: true
    });

    // Add index for better performance
    await queryInterface.addIndex('pdfs', ['test_id']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('pdfs', ['test_id']);
    await queryInterface.removeColumn('pdfs', 'test_id');
  }
};
