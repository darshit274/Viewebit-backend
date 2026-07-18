'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AssignmentSubmission extends Model {
    static associate(models) {
      AssignmentSubmission.belongsTo(models.Assignment, { foreignKey: 'assignment_id', as: 'assignment' });
      AssignmentSubmission.belongsTo(models.User, { foreignKey: 'user_id', targetKey: 'uuid', as: 'student' });
      AssignmentSubmission.belongsTo(models.Educator, { foreignKey: 'graded_by', as: 'grader' });
    }
  }

  AssignmentSubmission.init({
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
    assignment_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    submission_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    file_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('submitted', 'late', 'graded', 'returned'),
      defaultValue: 'submitted',
      allowNull: false
    },
    grade: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    graded_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    graded_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AssignmentSubmission',
    tableName: 'assignment_submissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return AssignmentSubmission;
};
