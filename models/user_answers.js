'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User_Answers extends Model {
    static associate(models) {
     
    }
  }
  User_Answers.init({
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
    question_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'questions', // name of the target table
            key: 'id' // key in the target table that we're referencing
        },
    },
    selected_option: {
        type: DataTypes.STRING,
        allowNull: false, // required field for the selected option
    },
    is_correct: {
        type: DataTypes.BOOLEAN,
        allowNull: false, // required field to indicate if the answer is correct
    },

    }, {
    sequelize,
    modelName: 'User_Answers',
    tableName: 'user_answers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return User_Answers;
};
