'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('free_tests', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Free test title'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Test Classification
      test_type: {
        type: Sequelize.ENUM('practice', 'mock', 'sample', 'general'),
        allowNull: false,
        defaultValue: 'practice',
        comment: 'Type of free test'
      },
      
      // Subject/Topic
      subject_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'subjects',
          key: 'id'
        }
      },
      
      subject_hierarchy_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'subject_hierarchies',
          key: 'id'
        }
      },
      
      // Test Configuration
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
        comment: 'Test duration in minutes'
      },
      
      // Test Settings
      allows_pause_resume: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      negative_marking: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      negative_marks: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0
      },
      
      // Multi-language Support
      supports_multilanguage: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this test supports multiple languages'
      },
      
      // Instructions
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Status
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      
      // Admin Information
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('free_tests', ['is_active']);
    await queryInterface.addIndex('free_tests', ['test_type']);
    await queryInterface.addIndex('free_tests', ['subject_id']);
    await queryInterface.addIndex('free_tests', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('free_tests');
  }
};