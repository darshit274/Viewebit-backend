'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('assessment_leads');
    if (!desc.crm_synced) {
      await queryInterface.addColumn('assessment_leads', 'crm_synced', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!desc.crm_synced_at) {
      await queryInterface.addColumn('assessment_leads', 'crm_synced_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('assessment_leads', 'crm_synced_at');
    await queryInterface.removeColumn('assessment_leads', 'crm_synced');
  }
};
