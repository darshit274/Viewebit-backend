'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      Subscription.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      if (models.TestSeries) {
        Subscription.belongsTo(models.TestSeries, {
          foreignKey: 'test_series_id',
          as: 'testSeries'
        });
      }
    }
  }
  Subscription.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'uuid'
      },
    },
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'test_series',
        key: 'id'
      },
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount_paid: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'INR',
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending',
    },
    purchase_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    }, {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscription',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Subscription;
};
