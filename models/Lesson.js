'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Lesson extends Model {
    static associate(models) {
      Lesson.belongsTo(models.CourseModule, { foreignKey: 'course_module_id', as: 'module' });
      Lesson.belongsTo(models.Pdfs, { foreignKey: 'pdf_id', as: 'pdf' });
      // Deprecated: the plain Test model isn't what the app's actual
      // quiz-taking screens launch (they require a Category uuid, via
      // /dynamic/categories/:uuid/questions) — kept only for legacy data.
      Lesson.belongsTo(models.Test, { foreignKey: 'test_id', as: 'test' });
      if (models.Category) {
        Lesson.belongsTo(models.Category, { foreignKey: 'category_id', as: 'quizCategory' });
      }
      if (models.LiveSession) {
        Lesson.belongsTo(models.LiveSession, { foreignKey: 'live_session_id', as: 'liveSession' });
      }
      Lesson.hasMany(models.LessonProgress, { foreignKey: 'lesson_id', as: 'progress' });
    }
  }

  Lesson.init({
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
    course_module_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lesson_type: {
      type: DataTypes.ENUM('video', 'document', 'quiz', 'live'),
      allowNull: false
    },
    video_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    content_html: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pdf_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Points at an existing Pdfs row — reused, not duplicated'
    },
    test_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Deprecated — the live quiz-taking flow uses category_id (Category model), not the plain Test model'
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Points at a Category (question_holder) node — student clients deep-link into the actual quiz-taking flow via its uuid (/dynamic/categories/:uuid/questions)'
    },
    live_session_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Points at a LiveSession row (added in Phase 5); nullable until scheduled'
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    is_free_preview: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Lesson',
    tableName: 'lessons',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Lesson;
};
