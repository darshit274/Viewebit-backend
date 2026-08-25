'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('live_sessions', {
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
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'courses',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      educator_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'educators',
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
      scheduled_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      scheduled_end: {
        type: Sequelize.DATE,
        allowNull: true
      },
      meeting_provider: {
        type: Sequelize.ENUM('zoom', 'google_meet', 'jitsi', 'other'),
        allowNull: false,
        defaultValue: 'other'
      },
      meeting_url: {
        type: Sequelize.STRING(1000),
        allowNull: false
      },
      is_embeddable: {
        type: Sequelize.TINYINT(1),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'live', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled'
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

    await queryInterface.addIndex('live_sessions', ['educator_id'], { name: 'idx_live_sessions_educator' });
    await queryInterface.addIndex('live_sessions', ['scheduled_start'], { name: 'idx_live_sessions_start' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('live_sessions');
  }
};
