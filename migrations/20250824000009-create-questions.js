'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if questions table exists
    const tableExists = await queryInterface.tableExists('questions');
    
    if (!tableExists) {
      await queryInterface.createTable('questions', {
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
      test_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Direct link to category for simplified hierarchy',
        references: {
          model: 'categories',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      question_text_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Question text in Gujarati language'
      },
      option_a: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      option_a_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Option A in Gujarati language'
      },
      option_b: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      option_b_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Option B in Gujarati language'
      },
      option_c: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      option_c_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Option C in Gujarati language'
      },
      option_d: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      option_d_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Option D in Gujarati language'
      },
      correct_answer: {
        type: Sequelize.ENUM('A', 'B', 'C', 'D'),
        allowNull: false
      },
      explanation: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      explanation_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Explanation in Gujarati language'
      },
      marks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      subject_tag: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Subject tag for the question (e.g., Mathematics, Physics)'
      },
      topic_tag: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Topic tag for the question (e.g., Algebra, Geometry)'
      },
      difficulty_tag: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Difficulty level of the question'
      },
      time_to_solve_seconds: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 120,
        comment: 'Expected time to solve this question in seconds'
      },
      question_type: {
        type: Sequelize.ENUM('single_choice', 'multiple_choice', 'true_false', 'fill_blank'),
        allowNull: false,
        defaultValue: 'single_choice',
        comment: 'Type of question'
      },
      negative_marks: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Negative marks for wrong answer'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order for sorting questions'
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
        await queryInterface.addIndex('questions', ['test_id'], { name: 'questions_test_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index questions_test_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('questions', ['subject_tag'], { name: 'questions_subject_tag' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index questions_subject_tag already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('questions', ['difficulty_tag'], { name: 'questions_difficulty_tag' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index questions_difficulty_tag already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('questions', ['display_order'], { name: 'questions_display_order' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index questions_display_order already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('questions', ['marks'], { name: 'questions_marks' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index questions_marks already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('questions', ['category_id'], { name: 'idx_questions_category' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index idx_questions_category already exists, skipping...');
      }
    } else {
      console.log('Questions table already exists, skipping table creation...');
      
      // Still try to add indexes if they don't exist
      try {
        await queryInterface.addIndex('questions', ['test_id'], { name: 'questions_test_id' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index questions_test_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('questions', ['subject_tag'], { name: 'questions_subject_tag' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index questions_subject_tag already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('questions', ['difficulty_tag'], { name: 'questions_difficulty_tag' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index questions_difficulty_tag already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('questions', ['display_order'], { name: 'questions_display_order' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index questions_display_order already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('questions', ['marks'], { name: 'questions_marks' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index questions_marks already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('questions', ['category_id'], { name: 'idx_questions_category' });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index idx_questions_category already exists, skipping...');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('questions');
  }
};