'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('test_series', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true
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
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'exam_categories',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      is_free: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      difficulty_level: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
        allowNull: true,
        defaultValue: 'intermediate'
      },
      total_tests: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      is_published: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      is_featured: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.TINYINT(1),
        allowNull: true,
        defaultValue: 1
      },
      created_by: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      name_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Test series name in Gujarati language'
      },
      description_gujarati: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Test series description in Gujarati language'
      },
      free_tests_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of free tests in paid series'
      },
      requires_subscription: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Whether series requires subscription to access'
      },
      negative_marking_enabled: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Whether negative marking is enabled for this series'
      },
      negative_marking_value: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.25,
        comment: 'Negative marking value (e.g., 0.25, 0.20, 0.33)'
      },
      one_time_completion: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Whether tests can be taken only once'
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Maximum attempts allowed per test'
      },
      auto_submit_on_expire: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: 'Auto submit test when time expires'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('test_series', ['category_id'], { name: 'test_series_category_id' });
    await queryInterface.addIndex('test_series', ['is_published'], { name: 'test_series_is_published' });
    await queryInterface.addIndex('test_series', ['is_active'], { name: 'test_series_is_active' });
    await queryInterface.addIndex('test_series', ['uuid'], { name: 'test_series_uuid' });
    await queryInterface.addIndex('test_series', ['is_free'], { name: 'test_series_is_free' });
    await queryInterface.addIndex('test_series', ['requires_subscription'], { name: 'test_series_requires_subscription' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('test_series');
  }
};