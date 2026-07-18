'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate(models) {
      Department.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
      if (models.Admin) {
        Department.hasMany(models.Admin, { foreignKey: 'department_id', as: 'admins' });
      }
      if (models.Educator) {
        Department.hasMany(models.Educator, { foreignKey: 'department_id', as: 'educators' });
      }
      if (models.User) {
        Department.hasMany(models.User, { foreignKey: 'department_id', as: 'students' });
      }
      if (models.TestSeries) {
        Department.hasMany(models.TestSeries, { foreignKey: 'department_id', as: 'testSeries' });
      }
      if (models.PdfCategory) {
        Department.hasMany(models.PdfCategory, { foreignKey: 'department_id', as: 'pdfCategories' });
      }
    }
  }

  Department.init({
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
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Department;
};
