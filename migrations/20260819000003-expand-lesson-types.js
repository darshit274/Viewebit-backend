'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('lessons', 'lesson_type', {
      type: Sequelize.ENUM('video', 'document', 'text', 'pdf', 'audio', 'quiz', 'live', 'assignment'),
      allowNull: false
    });

    await queryInterface.addColumn('lessons', 'assignment_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'assignments',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addIndex('lessons', ['assignment_id'], { name: 'idx_lessons_assignment' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('lessons', 'idx_lessons_assignment');
    await queryInterface.removeColumn('lessons', 'assignment_id');
    await queryInterface.changeColumn('lessons', 'lesson_type', {
      type: Sequelize.ENUM('video', 'document', 'quiz', 'live'),
      allowNull: false
    });
  }
};
