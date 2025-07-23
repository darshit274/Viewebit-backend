'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Questions extends Model {
    static associate(models) {
      Questions.belongsTo(models.Test, {
        foreignKey: 'test_id',
        as: 'test'
      });
      Questions.hasMany(models.User_Answers, {
        foreignKey: 'question_id',
        as: 'userAnswers'
      });
    }
  }
  Questions.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    test_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'test',
            key: 'id'
        },
    },
    question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    question_text_gujarati: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    option_a: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    option_a_gujarati: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    option_b: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    option_b_gujarati: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    option_c: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    option_c_gujarati: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    option_d: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    option_d_gujarati: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    correct_answer: {
        type: DataTypes.ENUM('A', 'B', 'C', 'D'),
        allowNull: false,
    },
    explanation: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    explanation_gujarati: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    difficulty: {
        type: DataTypes.ENUM('easy', 'medium', 'hard'),
        defaultValue: 'medium',
        allowNull: false,
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    topic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    marks: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
    },
    negative_marks: {
        type: DataTypes.DOUBLE,
        defaultValue: 0,
        allowNull: false,
    },

    }, {
    sequelize,
    modelName: 'Questions',
    tableName: 'questions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Questions;
};
