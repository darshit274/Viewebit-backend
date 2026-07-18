'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Assignment extends Model {
    static associate(models) {
      Assignment.belongsTo(models.Course, { foreignKey: 'course_id', as: 'course' });
      Assignment.belongsTo(models.Educator, { foreignKey: 'educator_id', as: 'educator' });
      // Deprecated — see Lesson.js: the live quiz flow uses Category, not Test.
      Assignment.belongsTo(models.Test, { foreignKey: 'test_id', as: 'test' });
      if (models.Category) {
        Assignment.belongsTo(models.Category, { foreignKey: 'category_id', as: 'quizCategory' });
      }
      Assignment.hasMany(models.AssignmentSubmission, { foreignKey: 'assignment_id', as: 'submissions' });
    }
  }

  Assignment.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    educator_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    submission_type: {
      type: DataTypes.ENUM('quiz', 'file_upload', 'text'),
      allowNull: false
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Deprecated — quiz-type assignments now use category_id'
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Used when submission_type=quiz — points at a Category (question_holder) node; grading reads TestSession.session_data.category_uuid'
    },
    max_points: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      allowNull: false
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    allow_late_submission: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Assignment',
    tableName: 'assignments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Assignment;
};
