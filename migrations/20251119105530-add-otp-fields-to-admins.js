'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if otp column exists before adding
    const tableDescription = await queryInterface.describeTable('admins');

    if (!tableDescription.otp) {
      await queryInterface.addColumn('admins', 'otp', {
        type: Sequelize.STRING,
        allowNull: true,
        after: 'permissions'
      });
    }

    if (!tableDescription.otpExpiry) {
      await queryInterface.addColumn('admins', 'otpExpiry', {
        type: Sequelize.DATE,
        allowNull: true,
        after: 'otp'
      });
    }
  },

  async down (queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('admins');

    if (tableDescription.otp) {
      await queryInterface.removeColumn('admins', 'otp');
    }

    if (tableDescription.otpExpiry) {
      await queryInterface.removeColumn('admins', 'otpExpiry');
    }
  }
};
