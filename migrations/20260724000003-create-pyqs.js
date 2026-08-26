'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('pyqs')) {
      return;
    }

    await queryInterface.createTable('pyqs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      exam_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'exam_types',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      exam_year: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      exam_session: {
        type: Sequelize.STRING,
        allowNull: true
      },
      paper_type: {
        type: Sequelize.ENUM('prelims', 'mains', 'full', 'sectional'),
        allowNull: false,
        defaultValue: 'full'
      },
      paper_number: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      total_questions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 120
      },
      total_marks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      negative_marking: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      negative_marks: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0
      },
      supports_multilanguage: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      original_exam_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      conducting_authority: {
        type: Sequelize.STRING,
        allowNull: true
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      exam_pattern_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('pyqs', ['exam_type_id'], { name: 'pyqs_exam_type_id' });
    await queryInterface.addIndex('pyqs', ['exam_year'], { name: 'pyqs_exam_year' });
    await queryInterface.addIndex('pyqs', ['is_active'], { name: 'pyqs_is_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pyqs');
  }
};
