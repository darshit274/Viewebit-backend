'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Test_Series extends Model {
    static associate(models) {
     
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
    course_id: {
      type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'courses', // name of the target table
            key: 'id' // key in the target table that we're referencing
        },
    },
    total_tests: {
      type: DataTypes.INTEGER,
        allowNull: false,   
    },
    price: { 
        type: DataTypes.DOUBLE,
        allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
        allowNull: true // optional
    },
    instructions: {
      type: DataTypes.TEXT,
        allowNull: true // optional 
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
