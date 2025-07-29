'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add isEmailVerified column
    await queryInterface.addColumn('users', 'isEmailVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Add otpExpiry column
    await queryInterface.addColumn('users', 'otpExpiry', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add lastLogin column
    await queryInterface.addColumn('users', 'lastLogin', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add isActive column
    await queryInterface.addColumn('users', 'isActive', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });

    // Add subscription_status column
    await queryInterface.addColumn('users', 'subscription_status', {
      type: Sequelize.ENUM('none', 'active', 'expired'),
      defaultValue: 'none',
      allowNull: false
    });

    // Add total_subscriptions column
    await queryInterface.addColumn('users', 'total_subscriptions', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    // Add subscription_expiry_reminder_sent column
    await queryInterface.addColumn('users', 'subscription_expiry_reminder_sent', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'isEmailVerified');
    await queryInterface.removeColumn('users', 'otpExpiry');
    await queryInterface.removeColumn('users', 'lastLogin');
    await queryInterface.removeColumn('users', 'isActive');
    await queryInterface.removeColumn('users', 'subscription_status');
    await queryInterface.removeColumn('users', 'total_subscriptions');
    await queryInterface.removeColumn('users', 'subscription_expiry_reminder_sent');
  }
};