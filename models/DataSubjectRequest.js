'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DataSubjectRequest extends Model {
    static associate(models) {
      // Intentionally no belongsTo/FK constraint on subject_uuid or
      // performed_by_admin_id: the subject may be a User or an Educator
      // depending on subject_type, and this table must remain a readable
      // audit trail even after the subject row is anonymized or an admin
      // account is later deactivated.
    }
  }

  DataSubjectRequest.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    subject_type: {
      type: DataTypes.ENUM('student', 'educator'),
      allowNull: false
    },
    subject_uuid: {
      type: DataTypes.UUID,
      allowNull: false
    },
    request_type: {
      type: DataTypes.ENUM('export', 'anonymize'),
      allowNull: false
    },
    performed_by_admin_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    institution_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'DataSubjectRequest',
    tableName: 'data_subject_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return DataSubjectRequest;
};
