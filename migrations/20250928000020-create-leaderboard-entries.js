'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('leaderboard_entries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      test_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tests',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      test_session_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'test_sessions',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'test_series',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'For category-based leaderboards'
      },
      score: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      correct_answers: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      wrong_answers: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      unanswered: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      time_taken_seconds: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total time taken to complete the test'
      },
      rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Calculated rank for this test'
      },
      percentile: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Percentile score (0-100)'
      },
      completion_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the test was completed'
      },
      is_valid: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: 'False for tests that should be excluded from rankings (e.g., practice tests)'
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
    await queryInterface.addIndex('leaderboard_entries', ['test_session_id'], { name: 'test_session_id' });
    await queryInterface.addIndex('leaderboard_entries', ['user_id'], { name: 'leaderboard_entries_user_id' });
    await queryInterface.addIndex('leaderboard_entries', ['test_id'], { name: 'leaderboard_entries_test_id' });
    await queryInterface.addIndex('leaderboard_entries', ['test_series_id'], { name: 'leaderboard_entries_test_series_id' });
    await queryInterface.addIndex('leaderboard_entries', ['category_id'], { name: 'leaderboard_entries_category_id' });
    await queryInterface.addIndex('leaderboard_entries', ['score', 'completion_date'], { name: 'leaderboard_entries_score_date' });
    await queryInterface.addIndex('leaderboard_entries', ['is_valid'], { name: 'leaderboard_entries_is_valid' });
    await queryInterface.addIndex('leaderboard_entries', ['rank'], { name: 'leaderboard_entries_rank' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('leaderboard_entries');
  }
};