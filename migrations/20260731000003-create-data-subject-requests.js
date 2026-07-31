'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('data_subject_requests')) {
      return;
    }

    await queryInterface.createTable('data_subject_requests', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      subject_type: {
        type: Sequelize.ENUM('student', 'educator'),
        allowNull: false
      },
      subject_uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false
      },
      request_type: {
        type: Sequelize.ENUM('export', 'anonymize'),
        allowNull: false
      },
      performed_by_admin_id: {
        type: Sequelize.CHAR(36),
        allowNull: false
      },
      institution_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('data_subject_requests', ['subject_type', 'subject_uuid'], { name: 'dsr_subject' });
    await queryInterface.addIndex('data_subject_requests', ['institution_id'], { name: 'dsr_institution' });
    await queryInterface.addIndex('data_subject_requests', ['created_at'], { name: 'dsr_created_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('data_subject_requests');
  }
};
