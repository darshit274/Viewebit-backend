'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('certificates', {
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      template_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'certificate_templates',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      certificate_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      verification_code: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true
      },
      pdf_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      issued_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('issued', 'revoked'),
        allowNull: false,
        defaultValue: 'issued'
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

    await queryInterface.addIndex('certificates', ['user_id', 'course_id'], { name: 'idx_certificates_user_course', unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('certificates');
  }
};
