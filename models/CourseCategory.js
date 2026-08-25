'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CourseCategory extends Model {
    static associate(models) {
      CourseCategory.belongsTo(models.Educator, { foreignKey: 'educator_id', as: 'educator' });
      CourseCategory.belongsToMany(models.Course, {
        through: models.CourseCategoryLink,
        foreignKey: 'course_category_id',
        otherKey: 'course_id',
        as: 'courses'
      });
    }
  }

  CourseCategory.init({
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
    educator_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'CourseCategory',
    tableName: 'course_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return CourseCategory;
};
