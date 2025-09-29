'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscription', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      payment_method: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      amount_paid: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'INR'
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: true,
        defaultValue: 'pending'
      },
      purchase_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      expiry_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata for the subscription (payment details, PDF info, etc.)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('subscription', ['user_id'], { name: 'subscription_user_id' });
    await queryInterface.addIndex('subscription', ['test_series_id'], { name: 'subscription_test_series_id' });
    await queryInterface.addIndex('subscription', ['status'], { name: 'subscription_status' });
    await queryInterface.addIndex('subscription', ['transaction_id'], { name: 'subscription_transaction_id' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('subscription');
  }
};