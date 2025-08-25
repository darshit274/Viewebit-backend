'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('new_test_series', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      name_gujarati: {
        type: Sequelize.TEXT,
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
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'INR'
      },
      free_test_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      difficulty_level: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: false,
        defaultValue: 'beginner'
      },
      max_attempts_per_test: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      supports_pause_resume: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      supports_multilanguage: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      has_negative_marking: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      negative_marks: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.25
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
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      total_categories: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      total_tests: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      total_enrollments: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      average_rating: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      total_reviews: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      created_by: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
        references: {
          model: 'admins',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL'
      },
      pricing_type: {
        type: Sequelize.ENUM('free', 'paid'),
        allowNull: false,
        defaultValue: 'free'
      },
      demo_tests_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      subscription_duration_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 365
      },
      features: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON field to store additional features like study materials, mock tests, etc.'
      },
      discount_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
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
    await queryInterface.addIndex('new_test_series', ['is_active', 'is_published'], { name: 'new_test_series_status_index' });
    await queryInterface.addIndex('new_test_series', ['created_by'], { name: 'new_test_series_created_by_index' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('new_test_series');
  }
};