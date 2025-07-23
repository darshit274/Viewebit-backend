'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User_Answers extends Model {
    static associate(models) {
      User_Answers.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      User_Answers.belongsTo(models.Test, {
        foreignKey: 'test_id',
        as: 'test'
      });
      User_Answers.belongsTo(models.Questions, {
        foreignKey: 'question_id',
        as: 'question'
      });
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
        model: 'users',
        key: 'uuid'
      },
    },
    test_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'test',
        key: 'id'
      },
    },
    question_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'questions',
        key: 'id'
      },
    },
    selected_option: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D'),
      allowNull: true,
    },
    is_correct: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    time_taken: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    marks_obtained: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
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
