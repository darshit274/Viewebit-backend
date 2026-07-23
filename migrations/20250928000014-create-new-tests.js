'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('new_tests', {
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
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      title_gujarati: {
        type: Sequelize.STRING(400),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      description_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'new_test_series',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'hierarchy_categories',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      test_type: {
        type: Sequelize.ENUM('practice', 'mock', 'assessment', 'sample', 'full_length', 'previous_year', 'sectional'),
        allowNull: true,
        defaultValue: 'practice'
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      total_marks: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      passing_marks: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      is_free: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      is_one_time: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      allows_pause: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 1
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      has_negative_marking: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      negative_marks: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      marks_per_question: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1
      },
      available_from: {
        type: Sequelize.DATE,
        allowNull: true
      },
      available_until: {
        type: Sequelize.DATE,
        allowNull: true
      },
      show_results_immediately: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 1
      },
      show_correct_answers: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 1
      },
      show_explanations: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 1
      },
      supports_multilanguage: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 1
      },
      randomize_questions: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      randomize_options: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      instructions_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      slug: {
        type: Sequelize.STRING(200),
        allowNull: true,
        unique: true
      },
      thumbnail_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      is_active: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 1
      },
      is_featured: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      is_published: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      total_attempts: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      total_completions: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      average_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      average_time_taken: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      highest_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      lowest_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      pass_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
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
    await queryInterface.addIndex('new_tests', ['created_by'], { name: 'new_tests_created_by' });
    await queryInterface.addIndex('new_tests', ['test_series_id'], { name: 'new_tests_series_index' });
    await queryInterface.addIndex('new_tests', ['category_id'], { name: 'new_tests_category_index' });
    await queryInterface.addIndex('new_tests', ['test_type'], { name: 'new_tests_type_index' });
    await queryInterface.addIndex('new_tests', ['is_active', 'is_published'], { name: 'new_tests_status_index' });
    await queryInterface.addIndex('new_tests', ['display_order'], { name: 'new_tests_display_order_index' });
    await queryInterface.addIndex('new_tests', ['available_from', 'available_until'], { name: 'new_tests_availability_index' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('new_tests');
  }
};