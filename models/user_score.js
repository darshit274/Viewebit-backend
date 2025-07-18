'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User_Score extends Model {
    static associate(models) {
     
    }
  }
  User_Score.init({

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
    test_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'test', // name of the target table
            key: 'id' // key in the target table that we're referencing
        },
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false, // required field for the score
    },
    correct_answers_count: {
        type: DataTypes.INTEGER,
        allowNull: false, // required field for the count of correct answers
    },
    wrong_answers_count: {
        type: DataTypes.INTEGER,
        allowNull: false, // required field for the count of wrong answers
    },
    percentage: {
        type: DataTypes.FLOAT,
        allowNull: false, // required field for the percentage score
    },
    time_taken: {
        type: DataTypes.INTEGER,
        allowNull: true, // optional field for the time taken in seconds    
    },
    }, {
    sequelize,
    modelName: 'User_Score',
    tableName: 'user_score',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return User_Score;
};
