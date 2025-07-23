'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'subscription_status', {
      type: Sequelize.ENUM('none', 'active', 'expired'),
      defaultValue: 'none',
      allowNull: false,
      comment: 'Current subscription status of the user'
    });

    await queryInterface.addColumn('users', 'total_subscriptions', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Total number of subscriptions purchased by user'
    });

    await queryInterface.addColumn('users', 'subscription_expiry_reminder_sent', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether expiry reminder email has been sent'
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('users', ['subscription_status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'subscription_status');
    await queryInterface.removeColumn('users', 'total_subscriptions');
    await queryInterface.removeColumn('users', 'subscription_expiry_reminder_sent');
  }
};