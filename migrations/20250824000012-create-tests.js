'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if tests table exists
    const tableExists = await queryInterface.tableExists('tests');
    
    if (!tableExists) {
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
        unique: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin'
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
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True if this test is a demo test in a paid series'
      },
      is_free_in_paid_series: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True if this test is free even in a paid test series'
      },
      negative_marking_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      negative_marks_per_wrong: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.25,
        comment: 'Negative marks deducted for each wrong answer'
      },
      is_one_time_only: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether to randomize question order'
      },
      show_results_immediately: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to show results immediately after test completion'
      },
      pass_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 60.00,
        comment: 'Minimum percentage required to pass'
      },
      allow_review: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
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
        await queryInterface.addIndex('tests', ['sub_category_id'], { name: 'sub_category_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index sub_category_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['is_demo'], { name: 'idx_tests_is_demo' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index idx_tests_is_demo already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['is_free_in_paid_series'], { name: 'idx_tests_is_free_in_paid_series' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index idx_tests_is_free_in_paid_series already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['is_one_time_only'], { name: 'idx_tests_is_one_time_only' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index idx_tests_is_one_time_only already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['negative_marking_enabled'], { name: 'idx_tests_negative_marking_enabled' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index idx_tests_negative_marking_enabled already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['is_free_in_series'], { name: 'tests_is_free_in_series' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index tests_is_free_in_series already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['difficulty_level'], { name: 'tests_difficulty_level' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index tests_difficulty_level already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['display_order'], { name: 'tests_display_order' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index tests_display_order already exists, skipping...');
      }
    } else {
      console.log('tests table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('tests', ['sub_category_id'], { name: 'sub_category_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index sub_category_id already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['is_demo'], { name: 'idx_tests_is_demo' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index idx_tests_is_demo already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['is_free_in_paid_series'], { name: 'idx_tests_is_free_in_paid_series' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index idx_tests_is_free_in_paid_series already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['is_one_time_only'], { name: 'idx_tests_is_one_time_only' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index idx_tests_is_one_time_only already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['negative_marking_enabled'], { name: 'idx_tests_negative_marking_enabled' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index idx_tests_negative_marking_enabled already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['is_free_in_series'], { name: 'tests_is_free_in_series' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index tests_is_free_in_series already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['difficulty_level'], { name: 'tests_difficulty_level' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index tests_difficulty_level already exists, skipping...');
      }
      
      try {
        await queryInterface.addIndex('tests', ['display_order'], { name: 'tests_display_order' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index tests_display_order already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tests');
  }
};