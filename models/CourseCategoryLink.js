'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CourseCategoryLink extends Model {
    static associate(models) {
      CourseCategoryLink.belongsTo(models.Course, { foreignKey: 'course_id', as: 'course' });
      CourseCategoryLink.belongsTo(models.CourseCategory, { foreignKey: 'course_category_id', as: 'category' });
    }
  }

  CourseCategoryLink.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    course_category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'CourseCategoryLink',
    tableName: 'course_category_links',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return CourseCategoryLink;
};
