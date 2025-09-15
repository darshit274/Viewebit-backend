'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pdfs', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Price for premium PDFs'
    });

    await queryInterface.addColumn('pdfs', 'currency', {
      type: Sequelize.STRING(10),
      defaultValue: 'INR',
      allowNull: false,
      comment: 'Currency for pricing'
    });

    await queryInterface.addColumn('pdfs', 'is_free', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether the PDF is free to access'
    });

    await queryInterface.addColumn('pdfs', 'discount_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Discount percentage if any'
    });

    await queryInterface.addColumn('pdfs', 'subscription_required', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether subscription is required to access'
    });

    await queryInterface.addColumn('pdfs', 'preview_pages', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of preview pages available for free'
    });

    console.log('✅ Added pricing fields to pdfs table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('pdfs', 'price');
    await queryInterface.removeColumn('pdfs', 'currency');
    await queryInterface.removeColumn('pdfs', 'is_free');
    await queryInterface.removeColumn('pdfs', 'discount_percentage');
    await queryInterface.removeColumn('pdfs', 'subscription_required');
    await queryInterface.removeColumn('pdfs', 'preview_pages');
  }
};
