'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // New test system associations
      if (models.UserAnswer) {
        User.hasMany(models.UserAnswer, {
          foreignKey: 'user_id',
          as: 'userAnswers'
        });
      }
      
      if (models.TestSession) {
        User.hasMany(models.TestSession, {
          foreignKey: 'user_id',
          as: 'testSessions'
        });
      }
      
      if (models.UserSubscription) {
        User.hasMany(models.UserSubscription, {
          foreignKey: 'user_id',
          as: 'userSubscriptions'
        });
      }
      
      // Legacy associations (only if models exist)
      if (models.Subscription) {
        User.hasMany(models.Subscription, {
          foreignKey: 'user_id',
          as: 'subscriptions'
        });
      }
      
      if (models.Notification) {
        User.hasMany(models.Notification, {
          foreignKey: 'user_id',
          as: 'notifications'
        });
      }
      
      if (models.PushToken) {
        User.hasMany(models.PushToken, {
          foreignKey: 'user_id',
          as: 'pushTokens'
        });
      }
    }
  }

  User.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true // optional
    },
    otp: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    otpExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    subscription_status: {
      type: DataTypes.ENUM('none', 'active', 'expired'),
      defaultValue: 'none',
      allowNull: false
    },
    total_subscriptions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    subscription_expiry_reminder_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true, // enables createdAt and updatedAt
    // underscored: true // maps to created_at and updated_at in DB
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return User;
};
