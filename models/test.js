'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Test extends Model {
    static associate(models) {
     
    }
  }
  Test.init({
    id: {
      type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    test_seried_child_id: {
      type: DataTypes.UUID,
      allowNull: false,
        references: {
            model: 'test_series_child', // name of the target table
            key: 'id' // key in the target table that we're referencing
        },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isFree: {
      type: DataTypes.BOOLEAN,
      defaultValue: false // default to false if not specified
    },
    isOneTimeTest: {
        type: DataTypes.BOOLEAN,
        defaultValue: false // default to false if not specified
    },
    time_limit: {   
        type: DataTypes.INTEGER, // time limit in minutes
        allowNull: true // optional, if you want to store time limits
    },
    negative_marking: {
        type: DataTypes.DOUBLE,
        allowNull: true // optional, if you want to store negative marking  
    },

    total_questions: {
        type: DataTypes.INTEGER,
        allowNull: false, // required field
    },

    total_marks: {
        type: DataTypes.INTEGER,
        allowNull: false, // required field 
    },

    


    }, {
    sequelize,
    modelName: 'Test',
    tableName: 'test',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Test;
};
