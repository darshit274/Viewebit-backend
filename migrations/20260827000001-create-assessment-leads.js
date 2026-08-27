'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('assessment_leads')) {
      return;
    }

    await queryInterface.createTable('assessment_leads', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      work_email: { type: Sequelize.STRING(255), allowNull: false },
      agency_name: { type: Sequelize.STRING(255), allowNull: false },
      job_title: { type: Sequelize.STRING(150), allowNull: false },
      employee_count_band: { type: Sequelize.STRING(20), allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      agency_type: { type: Sequelize.STRING(50), allowNull: false },
      current_ai_approach: { type: Sequelize.STRING(50), allowNull: false },
      answers: { type: Sequelize.JSON, allowNull: false },
      overall_score: { type: Sequelize.INTEGER, allowNull: false },
      maturity_level: {
        type: Sequelize.ENUM('ai_explorer', 'early_adopter', 'developing', 'ai_ready', 'ai_enabled'),
        allowNull: false
      },
      dimension_scores: { type: Sequelize.JSON, allowNull: false },
      top_opportunities: { type: Sequelize.JSON, allowNull: false },
      top_gaps: { type: Sequelize.JSON, allowNull: false },
      recommended_priorities: { type: Sequelize.JSON, allowNull: false },
      status: {
        type: Sequelize.ENUM('new', 'contacted', 'qualified', 'unqualified', 'closed'),
        allowNull: false,
        defaultValue: 'new'
      },
      admin_notes: { type: Sequelize.TEXT, allowNull: true },
      contacted_at: { type: Sequelize.DATE, allowNull: true },
      contacted_by: { type: Sequelize.INTEGER, allowNull: true },
      email_sent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      email_sent_at: { type: Sequelize.DATE, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('assessment_leads', ['work_email'], { name: 'assessment_leads_work_email' });
    await queryInterface.addIndex('assessment_leads', ['status'], { name: 'assessment_leads_status' });
    await queryInterface.addIndex('assessment_leads', ['created_at'], { name: 'assessment_leads_created_at' });
    await queryInterface.addIndex('assessment_leads', ['agency_type'], { name: 'assessment_leads_agency_type' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('assessment_leads');
  }
};
