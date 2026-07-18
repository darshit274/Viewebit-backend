'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Institution extends Model {
    static associate(models) {
      Institution.hasMany(models.Branch, { foreignKey: 'institution_id', as: 'branches' });
      if (models.Admin) {
        Institution.hasMany(models.Admin, { foreignKey: 'institution_id', as: 'admins' });
      }
      if (models.Educator) {
        Institution.hasMany(models.Educator, { foreignKey: 'institution_id', as: 'educators' });
      }
      if (models.User) {
        Institution.hasMany(models.User, { foreignKey: 'institution_id', as: 'students' });
      }
      if (models.TestSeries) {
        Institution.hasMany(models.TestSeries, { foreignKey: 'institution_id', as: 'testSeries' });
      }
      if (models.PdfCategory) {
        Institution.hasMany(models.PdfCategory, { foreignKey: 'institution_id', as: 'pdfCategories' });
      }
    }
  }

  Institution.init({
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    logo_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contact_email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Institution',
    tableName: 'institutions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Institution;
};
