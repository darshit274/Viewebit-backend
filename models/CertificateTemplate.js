'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CertificateTemplate extends Model {
    static associate(models) {
      CertificateTemplate.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
      CertificateTemplate.hasMany(models.Certificate, { foreignKey: 'template_id', as: 'certificates' });
    }
  }

  CertificateTemplate.init({
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
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    background_image_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    title_text: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Certificate of Completion'
    },
    body_text_template: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'This certifies that {{studentName}} has successfully completed the course {{courseName}} on {{issueDate}}.'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'CertificateTemplate',
    tableName: 'certificate_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return CertificateTemplate;
};
