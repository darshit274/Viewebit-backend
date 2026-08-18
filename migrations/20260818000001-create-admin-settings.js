'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('admin_settings')) {
      return;
    }

    await queryInterface.createTable('admin_settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      admin_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true,
        references: {
          model: 'admins',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      email_notifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      browser_notifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      weekly_reports: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      two_factor_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      timezone: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: 'Asia/Kolkata'
      },
      language: {
        type: Sequelize.STRING(8),
        allowNull: false,
        defaultValue: 'en'
      },
      date_format: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'DD/MM/YYYY'
      },
      default_page_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      auto_logout_time: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 480
      },
      theme_mode: {
        type: Sequelize.ENUM('light', 'dark', 'system'),
        allowNull: false,
        defaultValue: 'light'
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admin_settings');
  }
};
