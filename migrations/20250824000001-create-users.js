'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      uuid: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
      },
      username: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      profileImage: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      otp: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isEmailVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      otpExpiry: {
        type: Sequelize.DATE,
        allowNull: true
      },
      subscription_status: {
        type: Sequelize.ENUM('none', 'active', 'expired'),
        allowNull: false,
        defaultValue: 'none'
      },
      total_subscriptions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      subscription_expiry_reminder_sent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      fullName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      phoneNumber: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      schoolName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      avatarUrl: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('users', ['isActive'], { name: 'users_is_active' });
    await queryInterface.addIndex('users', ['lastLogin'], { name: 'users_last_login' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};