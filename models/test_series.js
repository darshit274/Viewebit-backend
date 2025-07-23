'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Test_Series extends Model {
    static associate(models) {
      Test_Series.hasMany(models.Test, {
        foreignKey: 'test_series_id',
        as: 'tests'
      });
      Test_Series.hasMany(models.Subscription, {
        foreignKey: 'test_series_id',
        as: 'subscriptions'
      });
    }
  }
  Test_Series.init({

    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    exam_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    original_price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    total_tests: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    free_tests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    duration_months: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },
    negative_marking: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    negative_marks: {
      type: DataTypes.DOUBLE,
      defaultValue: 0.25,
    },
    pass_percentage: {
      type: DataTypes.INTEGER,
      defaultValue: 40,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
        

    }, {
    sequelize,
    modelName: 'Test_Series',
    tableName: 'test_series',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Test_Series;
};
