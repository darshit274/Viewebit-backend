'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
     
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
            model: 'users', // name of the target table
            key: 'id' // key in the target table that we're referencing
        },
    },
    test_series_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'test_series', // name of the target table
            key: 'id' // key in the target table that we're referencing

        },
    },
    transaction_id: {
        type: DataTypes.STRING,
        allowNull: false, // required field for the transaction ID

    },
    purchase_on: {
        type: DataTypes.DATE,
        allowNull: false, // required field for the purchase date
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
