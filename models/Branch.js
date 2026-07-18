'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Branch extends Model {
    static associate(models) {
      Branch.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
      Branch.hasMany(models.Department, { foreignKey: 'branch_id', as: 'departments' });
      if (models.Admin) {
        Branch.hasMany(models.Admin, { foreignKey: 'branch_id', as: 'admins' });
      }
      if (models.Educator) {
        Branch.hasMany(models.Educator, { foreignKey: 'branch_id', as: 'educators' });
      }
      if (models.User) {
        Branch.hasMany(models.User, { foreignKey: 'branch_id', as: 'students' });
      }
      if (models.TestSeries) {
        Branch.hasMany(models.TestSeries, { foreignKey: 'branch_id', as: 'testSeries' });
      }
      if (models.PdfCategory) {
        Branch.hasMany(models.PdfCategory, { foreignKey: 'branch_id', as: 'pdfCategories' });
      }
    }
  }

  Branch.init({
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
    institution_id: {
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
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state: {
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
    modelName: 'Branch',
    tableName: 'branches',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Branch;
};
