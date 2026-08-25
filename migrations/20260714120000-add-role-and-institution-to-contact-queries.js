'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('contact_queries');

    if (!tableDescription.role) {
      await queryInterface.addColumn('contact_queries', 'role', {
        type: Sequelize.STRING(50),
        allowNull: true,
        after: 'mobile_number'
      });
    }

    if (!tableDescription.institution_name) {
      await queryInterface.addColumn('contact_queries', 'institution_name', {
        type: Sequelize.STRING(255),
        allowNull: true,
        after: 'role'
      });
    }
  },

  async down (queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('contact_queries');

    if (tableDescription.institution_name) {
      await queryInterface.removeColumn('contact_queries', 'institution_name');
    }

    if (tableDescription.role) {
      await queryInterface.removeColumn('contact_queries', 'role');
    }
  }
};
