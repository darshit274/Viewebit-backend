'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Certificate extends Model {
    static associate(models) {
      Certificate.belongsTo(models.User, { foreignKey: 'user_id', targetKey: 'uuid', as: 'student' });
      Certificate.belongsTo(models.Course, { foreignKey: 'course_id', as: 'course' });
      Certificate.belongsTo(models.CertificateTemplate, { foreignKey: 'template_id', as: 'template' });
    }
  }

  Certificate.init({
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    certificate_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    verification_code: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    pdf_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    issued_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('issued', 'revoked'),
      defaultValue: 'issued',
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Certificate',
    tableName: 'certificates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Certificate;
};
