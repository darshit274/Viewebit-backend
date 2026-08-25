'use strict';

/**
 * Pricing moves from individual PDFs to the ROOT pdf category — mirrors the
 * Course Management flow where pricing_type/price live on the test series and
 * everything inside inherits. Only root categories (hierarchy_level = 0) carry
 * meaningful values; sub-categories and PDFs resolve access by walking up to
 * their root.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pdf_categories', 'pricing_type', {
      type: Sequelize.ENUM('free', 'paid', 'restricted'),
      allowNull: false,
      defaultValue: 'free',
      comment: 'Access for the whole category tree (root categories only)',
    });
    await queryInterface.addColumn('pdf_categories', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: 'Price for the whole category when pricing_type = paid',
    });
    await queryInterface.addColumn('pdf_categories', 'discount_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pdf_categories', 'discount_percentage');
    await queryInterface.removeColumn('pdf_categories', 'price');
    await queryInterface.removeColumn('pdf_categories', 'pricing_type');
  },
};
