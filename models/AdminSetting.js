'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AdminSetting extends Model {
    static associate(models) {
      AdminSetting.belongsTo(models.Admin, {
        foreignKey: 'admin_id',
        as: 'admin'
      });
    }
  }

  AdminSetting.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    admin_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true
    },
    email_notifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    browser_notifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    weekly_reports: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    two_factor_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'Asia/Kolkata'
    },
    language: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'en'
    },
    date_format: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'DD/MM/YYYY'
    },
    default_page_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    auto_logout_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 480
    },
    theme_mode: {
      type: DataTypes.ENUM('light', 'dark', 'system'),
      allowNull: false,
      defaultValue: 'light'
    }
  }, {
    sequelize,
    modelName: 'AdminSetting',
    tableName: 'admin_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return AdminSetting;
};
