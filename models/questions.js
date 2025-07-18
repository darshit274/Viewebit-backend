'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Questions extends Model {
    static associate(models) {
        
     
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
            model: 'test', // name of the target table
            key: 'id' // key in the target table that we're referencing
        },
    },
    question_title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    option_a: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    option_b: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    option_c: {
        type: DataTypes.STRING,
        allowNull: true, // optional
    },
    option_d: {
        type: DataTypes.STRING,
        allowNull: true, // optional
    },
    correct_answer: {
        type: DataTypes.STRING,
        allowNull: false, // required field
    },
    explanation: {
        type: DataTypes.TEXT,
        allowNull: true, // optional field for explanation of the answer
    },
    marks: {
        type: DataTypes.INTEGER,
        allowNull: false, // required field for marks assigned to the question
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
