'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LiveSessionAttendance extends Model {
    static associate(models) {
      LiveSessionAttendance.belongsTo(models.LiveSession, { foreignKey: 'live_session_id', as: 'liveSession' });
      LiveSessionAttendance.belongsTo(models.User, { foreignKey: 'user_id', targetKey: 'uuid', as: 'student' });
    }
  }

  LiveSessionAttendance.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    live_session_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    left_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LiveSessionAttendance',
    tableName: 'live_session_attendance',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return LiveSessionAttendance;
};
