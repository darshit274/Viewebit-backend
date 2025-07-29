'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_subscriptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        allowNull: false
      },
      
      // Associations
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'test_series',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      
      // Subscription details
      subscription_type: {
        type: Sequelize.ENUM('free', 'paid', 'premium', 'trial', 'gifted'),
        defaultValue: 'free'
      },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'cancelled', 'paused', 'pending'),
        defaultValue: 'active'
      },
      
      // Pricing
      amount_paid: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'INR'
      },
      
      // Access control
      starts_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      max_attempts_per_test: {
        type: Sequelize.INTEGER,
        comment: 'Override global limits'
      },
      
      // Payment tracking
      payment_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'External payment system ID'
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: true
      },
      
      // Usage tracking
      tests_attempted: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      tests_completed: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      last_accessed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Admin notes and tracking
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for efficient queries
    await queryInterface.addIndex('user_subscriptions', ['uuid']);
    await queryInterface.addIndex('user_subscriptions', ['user_id']);
    await queryInterface.addIndex('user_subscriptions', ['test_series_id']);
    await queryInterface.addIndex('user_subscriptions', ['user_id', 'test_series_id']);
    await queryInterface.addIndex('user_subscriptions', ['status']);
    await queryInterface.addIndex('user_subscriptions', ['subscription_type']);
    await queryInterface.addIndex('user_subscriptions', ['expires_at']);
    await queryInterface.addIndex('user_subscriptions', ['payment_id']);
    await queryInterface.addIndex('user_subscriptions', ['payment_status']);
    
    // Unique constraint to prevent duplicate active subscriptions
    await queryInterface.addIndex('user_subscriptions', ['user_id', 'test_series_id', 'status'], {
      unique: true,
      name: 'unique_active_subscription',
      where: {
        status: 'active'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_subscriptions');
  }
};