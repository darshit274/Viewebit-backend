'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Educator extends Model {
    static associate(models) {
      Educator.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
      Educator.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
      Educator.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
      if (models.Course) {
        Educator.hasMany(models.Course, { foreignKey: 'educator_id', as: 'courses' });
      }
      if (models.Assignment) {
        Educator.hasMany(models.Assignment, { foreignKey: 'educator_id', as: 'assignments' });
      }
      if (models.LiveSession) {
        Educator.hasMany(models.LiveSession, { foreignKey: 'educator_id', as: 'liveSessions' });
      }
      if (models.Category) {
        Educator.hasMany(models.Category, { foreignKey: 'educator_id', as: 'quizCategories' });
      }
      if (models.PdfCategory) {
        Educator.hasMany(models.PdfCategory, { foreignKey: 'educator_id', as: 'pdfCategories' });
      }
      if (models.TestSeries) {
        Educator.belongsTo(models.TestSeries, { foreignKey: 'quiz_bank_test_series_id', as: 'quizBankTestSeries' });
      }
    }
  }

  Educator.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    institution_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    employee_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    otpExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    current_session_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      defaultValue: null
    },
    quiz_bank_test_series_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'A private TestSeries container auto-created to hold this educator\'s own quiz Category tree'
    }
  }, {
    sequelize,
    modelName: 'Educator',
    tableName: 'educators',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Educator;
};
