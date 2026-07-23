'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PushToken extends Model {
    static associate(models) {
      // Define associations here
      PushToken.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      });
    }
  }
  
  PushToken.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'uuid'
      }
    },
    push_token: {
      type: DataTypes.STRING(512),
      allowNull: false,
      comment: 'Expo/Firebase push token'
    },
    platform: {
      type: DataTypes.ENUM('ios', 'android'),
      allowNull: false
    },
    device_info: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Device information like name, OS version, etc.'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time this token was used to send a notification'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Token expiration date'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'PushToken',
    tableName: 'push_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['push_token'],
        unique: true
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['user_id', 'is_active']
      }
    ]
  });
  
  return PushToken;
};