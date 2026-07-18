'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('assignments', {
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
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      educator_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'educators',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      submission_type: {
        type: Sequelize.ENUM('quiz', 'file_upload', 'text'),
        allowNull: false
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
      max_points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      allow_late_submission: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1
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

    await queryInterface.addIndex('assignments', ['course_id'], { name: 'idx_assignments_course' });
    await queryInterface.addIndex('assignments', ['educator_id'], { name: 'idx_assignments_educator' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('assignments');
  }
};
