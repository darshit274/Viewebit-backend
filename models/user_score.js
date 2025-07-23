'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User_Score extends Model {
    static associate(models) {
      User_Score.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      User_Score.belongsTo(models.Test, {
        foreignKey: 'test_id',
        as: 'test'
      });
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
    total_score: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    correct_answers: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    wrong_answers: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unanswered: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    percentage: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    time_taken: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_passed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    attempt_number: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
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
