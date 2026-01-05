'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contact_queries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      full_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      mobile_number: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      query_message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'viewed', 'solved'),
        defaultValue: 'pending',
        allowNull: false
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      viewed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      viewed_by: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      solved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      solved_by: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('contact_queries', ['email'], {
      name: 'idx_contact_queries_email'
    });

    await queryInterface.addIndex('contact_queries', ['status'], {
      name: 'idx_contact_queries_status'
    });

    await queryInterface.addIndex('contact_queries', ['created_at'], {
      name: 'idx_contact_queries_created_at'
    });

    await queryInterface.addIndex('contact_queries', ['mobile_number'], {
      name: 'idx_contact_queries_mobile'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('contact_queries');
  }
};
