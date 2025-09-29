'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tests', {
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
      sub_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sub_categories',
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
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60
      },
      total_marks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_demo: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'True if this test is a demo test in a paid series'
      },
      is_free_in_paid_series: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'True if this test is free even in a paid test series'
      },
      negative_marking_enabled: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0
      },
      negative_marks_per_wrong: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.25,
        comment: 'Negative marks deducted for each wrong answer'
      },
      is_one_time_only: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'True if student can take this test only once in one session'
      },
      max_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum duration for one-time tests (overrides duration_minutes)'
      },
      attempt_restrictions: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON field for attempt restrictions like max attempts, cooldown periods'
      },
      passing_marks: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Minimum marks required to pass the test'
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Special instructions for the test'
      },
      instructions_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Test instructions in Gujarati'
      },
      is_free_in_series: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Whether this test is free in a paid series'
      },
      negative_marking: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Negative marking for this specific test (overrides series setting)'
      },
      time_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
        comment: 'Test duration in minutes'
      },
      max_attempts_override: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Override max attempts for this specific test'
      },
      difficulty_level: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Difficulty level of the test'
      },
      randomize_questions: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Whether to randomize question order'
      },
      show_results_immediately: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: 'Whether to show results immediately after test completion'
      },
      pass_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 60.00,
        comment: 'Minimum percentage required to pass'
      },
      allow_review: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: 'Whether students can review answers after test'
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of questions in the test'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order for sorting tests'
      },
      title_gujarati: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Test title in Gujarati language'
      },
      description_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Test description in Gujarati language'
      },
      is_active: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
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

    // Add indexes
    await queryInterface.addIndex('tests', ['sub_category_id'], { name: 'sub_category_id' });
    await queryInterface.addIndex('tests', ['is_demo'], { name: 'idx_tests_is_demo' });
    await queryInterface.addIndex('tests', ['is_free_in_paid_series'], { name: 'idx_tests_is_free_in_paid_series' });
    await queryInterface.addIndex('tests', ['is_one_time_only'], { name: 'idx_tests_is_one_time_only' });
    await queryInterface.addIndex('tests', ['negative_marking_enabled'], { name: 'idx_tests_negative_marking_enabled' });
    await queryInterface.addIndex('tests', ['is_free_in_series'], { name: 'tests_is_free_in_series' });
    await queryInterface.addIndex('tests', ['difficulty_level'], { name: 'tests_difficulty_level' });
    await queryInterface.addIndex('tests', ['display_order'], { name: 'tests_display_order' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tests');
  }
};