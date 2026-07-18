'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      Course.belongsTo(models.TestSeries, { foreignKey: 'test_series_id', as: 'testSeries' });
      Course.belongsTo(models.Educator, { foreignKey: 'educator_id', as: 'educator' });
      if (models.Branch) {
        Course.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
      }
      if (models.Department) {
        Course.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
      }
      Course.hasMany(models.CourseModule, { foreignKey: 'course_id', as: 'modules' });
      if (models.Assignment) {
        Course.hasMany(models.Assignment, { foreignKey: 'course_id', as: 'assignments' });
      }
      if (models.LiveSession) {
        Course.hasMany(models.LiveSession, { foreignKey: 'course_id', as: 'liveSessions' });
      }
      if (models.Certificate) {
        Course.hasMany(models.Certificate, { foreignKey: 'course_id', as: 'certificates' });
      }
    }
  }

  Course.init({
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
    test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
      comment: 'Points at an existing TestSeries root — courses reuse the existing quiz tree rather than owning their own'
    },
    educator_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    thumbnail_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
      allowNull: false
    },
    completion_threshold_percent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 80.00,
      allowNull: false,
      comment: 'Course completion % that triggers auto-issued certificates'
    }
  }, {
    sequelize,
    modelName: 'Course',
    tableName: 'courses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Course;
};
