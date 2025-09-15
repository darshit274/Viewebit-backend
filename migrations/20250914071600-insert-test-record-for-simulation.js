'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, create a sub_category if none exists
    const subCategories = await queryInterface.sequelize.query(
      'SELECT id FROM sub_categories LIMIT 1',
      { type: Sequelize.QueryTypes.SELECT }
    );

    let subCategoryId = 1;
    if (subCategories.length === 0) {
      // Create a sub_category first
      await queryInterface.bulkInsert('sub_categories', [{
        id: 1,
        uuid: 'temp-sub-category-uuid',
        category_id: 1, // Assuming category with id 1 exists
        name: 'Temp Sub Category',
        name_gujarati: 'અસ્થાયી પેટા કેટેગરી',
        display_order: 1,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }]);
    } else {
      subCategoryId = subCategories[0].id;
    }

    // Insert a test record into the tests table for simulation purposes
    await queryInterface.bulkInsert('tests', [{
      id: 5,
      uuid: 'c3d4e5f6-g7h8-9012-cdef-345678901234',
      sub_category_id: subCategoryId,
      title: 'Sample Test for Simulation',
      title_gujarati: 'સિમ્યુલેશન માટે નમૂના ટેસ્ટ',
      description: 'Test created for leaderboard simulation purposes',
      description_gujarati: 'લીડરબોર્ડ સિમ્યુલેશન હેતુ માટે બનાવેલ ટેસ્ટ',
      duration_minutes: 60,
      total_marks: 2,
      total_questions: 2,
      is_demo: 0,
      is_free_in_paid_series: 1,
      is_free_in_series: 1,
      negative_marking_enabled: 0,
      negative_marks_per_wrong: 0.00,
      is_one_time_only: 0,
      time_duration_minutes: 60,
      passing_marks: 1,
      instructions: 'This is a test for simulation purposes.',
      instructions_gujarati: 'આ સિમ્યુલેશન હેતુ માટેનો ટેસ્ટ છે.',
      difficulty_level: 'medium',
      randomize_questions: 0,
      show_results_immediately: 1,
      pass_percentage: 60.00,
      allow_review: 1,
      display_order: 1,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    console.log('✅ Test record inserted for simulation purposes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('tests', {
      uuid: 'c3d4e5f6-g7h8-9012-cdef-345678901234'
    });
  }
};