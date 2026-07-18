'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('live_session_attendance', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      live_session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'live_sessions',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      left_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      duration_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true
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

    await queryInterface.addIndex('live_session_attendance', ['live_session_id', 'user_id'], { name: 'idx_lsa_session_user', unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('live_session_attendance');
  }
};
