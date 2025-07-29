'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('test_series', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        allowNull: false
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
      
      // Hierarchical categorization
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'exam_categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      exam_type_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'exam_types',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      parent_series_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'test_series',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      hierarchy_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Materialized path for nested series'
      },
      
      // Pricing and access
      price: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false
      },
      original_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'INR'
      },
      is_free: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      free_test_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of free tests available in paid series'
      },
      
      // Content structure
      total_tests: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_questions: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      estimated_duration: {
        type: Sequelize.INTEGER,
        comment: 'Total estimated duration in minutes'
      },
      
      // Test configuration
      difficulty_level: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced', 'expert', 'mixed'),
        defaultValue: 'mixed'
      },
      access_duration_days: {
        type: Sequelize.INTEGER,
        comment: 'Days of access after purchase'
      },
      max_attempts_per_test: {
        type: Sequelize.INTEGER,
        comment: 'Global max attempts for tests in this series'
      },
      
      // Features
      supports_pause_resume: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      supports_multilanguage: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      has_negative_marking: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      negative_marks: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.25
      },
      
      // Content and instructions
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      instructions_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      prerequisites: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      learning_outcomes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // SEO and display
      slug: {
        type: Sequelize.STRING(200),
        unique: true,
        allowNull: true
      },
      thumbnail_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      tags: {
        type: Sequelize.JSON,
        comment: 'Array of tags for search and categorization'
      },
      
      // Status and visibility
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Analytics
      total_enrollments: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      average_rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0
      },
      total_reviews: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      
      // Admin tracking
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for efficient queries
    await queryInterface.addIndex('test_series', ['uuid']);
    await queryInterface.addIndex('test_series', ['category_id']);
    await queryInterface.addIndex('test_series', ['exam_type_id']);
    await queryInterface.addIndex('test_series', ['parent_series_id']);
    await queryInterface.addIndex('test_series', ['is_published', 'is_active']);
    await queryInterface.addIndex('test_series', ['is_featured']);
    await queryInterface.addIndex('test_series', ['slug']);
    await queryInterface.addIndex('test_series', ['price']);
    await queryInterface.addIndex('test_series', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('test_series');
  }
};