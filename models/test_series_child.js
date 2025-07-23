'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Test_Series_Child extends Model {
    static associate(models) {
     
    }
  }
  Test_Series_Child.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    test_series_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'test_series', // name of the target table
            key: 'id' // key in the target table that we're referencing
        },
    },
    parent_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,   
    },

    }, {
    sequelize,
    modelName: 'Test_Series_Child',
    tableName: 'test_series_child',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Test_Series_Child;
};
