'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint('lessons', {
      fields: ['live_session_id'],
      type: 'foreign key',
      name: 'fk_lessons_live_session',
      references: {
        table: 'live_sessions',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('lessons', 'fk_lessons_live_session');
  }
};
