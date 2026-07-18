'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LessonProgress extends Model {
    static associate(models) {
      LessonProgress.belongsTo(models.User, { foreignKey: 'user_id', targetKey: 'uuid', as: 'user' });
      LessonProgress.belongsTo(models.Lesson, { foreignKey: 'lesson_id', as: 'lesson' });
    }
  }

  LessonProgress.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    lesson_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
      defaultValue: 'not_started',
      allowNull: false
    },
    watch_seconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LessonProgress',
    tableName: 'lesson_progress',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return LessonProgress;
};
