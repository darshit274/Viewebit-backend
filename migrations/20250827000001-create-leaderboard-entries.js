'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if leaderboard_entries table exists
    const tableExists = await queryInterface.tableExists('leaderboard_entries');
    
    if (!tableExists) {
      await queryInterface.createTable('leaderboard_entries', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        user_id: {
          type: Sequelize.CHAR(36),
          allowNull: false,
          charset: 'utf8mb4',
          collate: 'utf8mb4_bin',
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
          charset: 'utf8mb4',
          collate: 'utf8mb4_bin',
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
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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

      // Add indexes only if table was created
      try {
        await queryInterface.addIndex('leaderboard_entries', ['user_id'], { name: 'leaderboard_entries_user_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_user_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['test_id'], { name: 'leaderboard_entries_test_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_test_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['test_series_id'], { name: 'leaderboard_entries_test_series_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_test_series_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['category_id'], { name: 'leaderboard_entries_category_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_category_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['score', 'completion_date'], { name: 'leaderboard_entries_score_date' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_score_date already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['is_valid'], { name: 'leaderboard_entries_is_valid' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_is_valid already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['rank'], { name: 'leaderboard_entries_rank' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_rank already exists, skipping...');
      }
    } else {
      console.log('Leaderboard entries table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('leaderboard_entries', ['user_id'], { name: 'leaderboard_entries_user_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_user_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['test_id'], { name: 'leaderboard_entries_test_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_test_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['test_series_id'], { name: 'leaderboard_entries_test_series_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_test_series_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['category_id'], { name: 'leaderboard_entries_category_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_category_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['score', 'completion_date'], { name: 'leaderboard_entries_score_date' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_score_date already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['is_valid'], { name: 'leaderboard_entries_is_valid' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_is_valid already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('leaderboard_entries', ['rank'], { name: 'leaderboard_entries_rank' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index leaderboard_entries_rank already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('leaderboard_entries');
  }
};