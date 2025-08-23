'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('dynamic_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true,
      },
      test_series_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'new_test_series',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      parent_category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'dynamic_categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Self-referencing for hierarchy - null for root categories',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name_gujarati: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      description_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      hierarchy_level: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: '0 for root categories, 1 for level 1 subcategories, etc.',
      },
      node_type: {
        type: Sequelize.ENUM('container', 'question_holder', 'unset'),
        defaultValue: 'unset',
        allowNull: false,
        comment: 'container = has subcategories, question_holder = has questions, unset = not decided yet',
      },
      has_questions: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'True if this category contains questions',
      },
      has_subcategories: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'True if this category contains subcategories',
      },
      questions_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Cached count of questions in this category',
      },
      subcategories_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Cached count of direct subcategories',
      },
      total_questions_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Cached count of all questions in this branch (recursive)',
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Order for displaying categories at the same level',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      // Test configuration (inherited if this becomes a question holder)
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Test duration for this category if it becomes a question holder',
      },
      total_marks: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      difficulty_level: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        defaultValue: 'medium',
        allowNull: false,
      },
      negative_marking_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      negative_marks_per_wrong: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.25,
        allowNull: false,
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      instructions_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('dynamic_categories', ['test_series_id']);
    await queryInterface.addIndex('dynamic_categories', ['parent_category_id']);
    await queryInterface.addIndex('dynamic_categories', ['hierarchy_level']);
    await queryInterface.addIndex('dynamic_categories', ['node_type']);
    await queryInterface.addIndex('dynamic_categories', ['display_order']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('dynamic_categories');
  },
};