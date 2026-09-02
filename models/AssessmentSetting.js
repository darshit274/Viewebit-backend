'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AssessmentSetting extends Model {
    static associate() {}
  }

  AssessmentSetting.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: false
    },
    intro_video_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AssessmentSetting',
    tableName: 'assessment_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return AssessmentSetting;
};
