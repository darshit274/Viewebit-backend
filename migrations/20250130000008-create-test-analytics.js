'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('test_analytics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      
      // What this analytics record is for
      analytics_type: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'test_completion', 'question_performance'),
        allowNull: false
      },
      analytics_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      
      // Associations (nullable for aggregate reports)
      test_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tests',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'test_series',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'questions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      
      // Participation metrics
      unique_users: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      completed_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      abandoned_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      
      // Performance metrics
      average_score: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      highest_score: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      lowest_score: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      median_score: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      
      // Time metrics
      average_completion_time: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Average completion time in seconds'
      },
      fastest_completion_time: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      slowest_completion_time: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      
      // Question-specific metrics (for question_performance type)
      correct_answers: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      wrong_answers: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      skipped_answers: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      accuracy_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      
      // Distribution data (JSON for flexibility)
      score_distribution: {
        type: Sequelize.JSON,
        comment: 'Score ranges and counts: {"0-20": 5, "21-40": 10, ...}'
      },
      time_distribution: {
        type: Sequelize.JSON,
        comment: 'Time ranges and counts'
      },
      difficulty_breakdown: {
        type: Sequelize.JSON,
        comment: 'Performance by difficulty level'
      },
      
      // Additional metadata
      metadata: {
        type: Sequelize.JSON,
        comment: 'Additional analytics data specific to type'
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
    await queryInterface.addIndex('test_analytics', ['analytics_type']);
    await queryInterface.addIndex('test_analytics', ['analytics_date']);
    await queryInterface.addIndex('test_analytics', ['test_id']);
    await queryInterface.addIndex('test_analytics', ['test_series_id']);
    await queryInterface.addIndex('test_analytics', ['question_id']);
    await queryInterface.addIndex('test_analytics', ['analytics_type', 'analytics_date']);
    await queryInterface.addIndex('test_analytics', ['test_id', 'analytics_date']);
    
    // Unique constraint for specific analytics records
    await queryInterface.addIndex('test_analytics', ['analytics_type', 'analytics_date', 'test_id', 'question_id'], {
      unique: true,
      name: 'unique_analytics_record'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('test_analytics');
  }
};