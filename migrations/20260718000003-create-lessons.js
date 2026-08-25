'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lessons', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true
      },
      course_module_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'course_modules',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      lesson_type: {
        type: Sequelize.ENUM('video', 'document', 'quiz', 'live'),
        allowNull: false
      },
      video_url: {
        type: Sequelize.STRING(1000),
        allowNull: true
      },
      content_html: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      pdf_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'pdfs',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      test_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tests',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      live_session_id: {
        // FK constraint deferred to Phase 5 (live_sessions table doesn't exist yet)
        type: Sequelize.INTEGER,
        allowNull: true
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_free_preview: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('lessons', ['course_module_id'], { name: 'idx_lessons_module' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lessons');
  }
};
