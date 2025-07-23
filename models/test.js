'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Test extends Model {
    static associate(models) {
      Test.belongsTo(models.Test_Series, {
        foreignKey: 'test_series_id',
        as: 'testSeries'
      });
      Test.hasMany(models.Questions, {
        foreignKey: 'test_id',
        as: 'questions'
      });
      Test.hasMany(models.User_Score, {
        foreignKey: 'test_id',
        as: 'userScores'
      });
      Test.hasMany(models.Pdfs, {
        foreignKey: 'test_id',
        as: 'pdfs'
      });
    }
  }
  Test.init({
    id: {
      type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    test_series_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'test_series',
        key: 'id'
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_free: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_one_time_test: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    negative_marking: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    negative_marks: {
      type: DataTypes.DOUBLE,
      defaultValue: 0.25,
    },
    pass_marks: {
      type: DataTypes.INTEGER,
      defaultValue: 40,
    },
    total_questions: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_marks: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
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
