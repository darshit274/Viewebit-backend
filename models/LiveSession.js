'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LiveSession extends Model {
    static associate(models) {
      LiveSession.belongsTo(models.Course, { foreignKey: 'course_id', as: 'course' });
      LiveSession.belongsTo(models.Educator, { foreignKey: 'educator_id', as: 'educator' });
      LiveSession.hasMany(models.LiveSessionAttendance, { foreignKey: 'live_session_id', as: 'attendance' });
      if (models.Lesson) {
        LiveSession.hasMany(models.Lesson, { foreignKey: 'live_session_id', as: 'lessons' });
      }
    }
  }

  LiveSession.init({
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
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    educator_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    scheduled_start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    scheduled_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    meeting_provider: {
      type: DataTypes.ENUM('zoom', 'google_meet', 'jitsi', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    meeting_url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_embeddable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'True only for providers that permit iframe embedding (e.g. Jitsi)'
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'live', 'completed', 'cancelled'),
      defaultValue: 'scheduled',
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'LiveSession',
    tableName: 'live_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return LiveSession;
};
