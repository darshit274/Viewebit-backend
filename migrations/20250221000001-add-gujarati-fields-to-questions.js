'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns exist before adding
    const tableDescription = await queryInterface.describeTable('questions');
    
    if (!tableDescription.question_text_gujarati) {
      await queryInterface.addColumn('questions', 'question_text_gujarati', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Question text in Gujarati language'
      });
    }

    if (!tableDescription.option_a_gujarati) {
      await queryInterface.addColumn('questions', 'option_a_gujarati', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Option A in Gujarati language'
      });
    }

    if (!tableDescription.option_b_gujarati) {
      await queryInterface.addColumn('questions', 'option_b_gujarati', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Option B in Gujarati language'
      });
    }

    if (!tableDescription.option_c_gujarati) {
      await queryInterface.addColumn('questions', 'option_c_gujarati', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Option C in Gujarati language'
      });
    }

    if (!tableDescription.option_d_gujarati) {
      await queryInterface.addColumn('questions', 'option_d_gujarati', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Option D in Gujarati language'
      });
    }

    if (!tableDescription.explanation_gujarati) {
      await queryInterface.addColumn('questions', 'explanation_gujarati', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Explanation in Gujarati language'
      });
    }

    // Add index for better performance when filtering by language (with key length for TEXT field)
    try {
      await queryInterface.addIndex('questions', [
        {
          attribute: 'question_text_gujarati',
          length: 255
        }
      ], {
        name: 'idx_questions_gujarati_text'
      });
    } catch (error) {
      console.log('Index idx_questions_gujarati_text already exists, skipping...');
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('questions', 'idx_questions_gujarati_text');

    // Remove columns
    await queryInterface.removeColumn('questions', 'question_text_gujarati');
    await queryInterface.removeColumn('questions', 'option_a_gujarati');
    await queryInterface.removeColumn('questions', 'option_b_gujarati');
    await queryInterface.removeColumn('questions', 'option_c_gujarati');
    await queryInterface.removeColumn('questions', 'option_d_gujarati');
    await queryInterface.removeColumn('questions', 'explanation_gujarati');
  }
};