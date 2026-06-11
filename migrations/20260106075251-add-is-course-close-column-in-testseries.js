'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('new_test_series');
    if (!tableDescription.is_course_closed) {
      await queryInterface.addColumn('new_test_series', 'is_course_closed', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
    }

  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('new_test_series');
    if (tableDescription.is_course_closed) {
      await queryInterface.removeColumn('new_test_series', 'is_course_closed');
    }
  }
};
