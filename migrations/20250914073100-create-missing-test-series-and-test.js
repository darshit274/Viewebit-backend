'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Insert the missing test series that the frontend is trying to access
    await queryInterface.bulkInsert('new_test_series', [{
      id: 5,
      uuid: '7d6ce252-87c1-4ab5-b4aa-461d4c193ca8',
      name: 'Veniam consequat C',
      name_gujarati: 'વેનિયમ કન્સેક્વેટ સી',
      description: 'Test series created for frontend compatibility',
      description_gujarati: 'ફ્રંટએન્ડ સુસંગતતા માટે બનાવેલ ટેસ્ટ શ્રેણી',
      price: 0.00,
      currency: 'INR',
      free_test_count: 1,
      difficulty_level: 'beginner',
      max_attempts_per_test: 3,
      supports_pause_resume: 1,
      supports_multilanguage: 1,
      has_negative_marking: 0,
      negative_marks: 0.00,
      instructions: 'Complete all questions to the best of your ability.',
      instructions_gujarati: 'તમારી શક્તિ મુજબ તમામ પ્રશ્નો પૂરા કરો.',
      slug: null,
      thumbnail_url: null,
      tags: null,
      is_active: 1,
      is_featured: 0,
      is_published: 1,
      published_at: new Date(),
      total_categories: 0,
      total_tests: 0,
      total_questions: 0,
      total_enrollments: 0,
      average_rating: 0.00,
      total_reviews: 0,
      created_by: null,
      pricing_type: 'free',
      demo_tests_count: 0,
      subscription_duration_days: 365,
      features: null,
      discount_percentage: 0.00,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    // Insert a test that belongs to this test series
    await queryInterface.bulkInsert('new_tests', [{
      id: 6,
      uuid: 'f1g2h3i4-j5k6-7890-lmno-pqrstuvwxyz1',
      title: 'Practice Test - Veniam Consequat',
      title_gujarati: 'પ્રેક્ટિસ ટેસ્ટ - વેનિયમ કન્સેક્વેટ',
      description: 'A comprehensive test to evaluate your knowledge',
      description_gujarati: 'તમારા જ્ઞાનનું મૂલ્યાંકન કરવા માટેનો વ્યાપક ટેસ્ટ',
      test_series_id: 5, // Links to the test series above
      category_id: 1,
      test_type: 'practice',
      duration_minutes: 60,
      total_questions: 2,
      total_marks: 2,
      passing_marks: 1,
      is_free: 1,
      price: 0.00,
      is_one_time: 0,
      allows_pause: 1,
      max_attempts: 3,
      has_negative_marking: 0,
      negative_marks: 0.00,
      marks_per_question: 1,
      available_from: null,
      available_until: null,
      show_results_immediately: 1,
      show_correct_answers: 1,
      show_explanations: 1,
      supports_multilanguage: 1,
      randomize_questions: 0,
      randomize_options: 0,
      instructions: 'Read each question carefully and select the best answer.',
      instructions_gujarati: 'દરેક પ્રશ્નને કાળજીથી વાંચો અને શ્રેષ્ઠ જવાબ પસંદ કરો.',
      slug: null,
      thumbnail_url: null,
      tags: null,
      metadata: null,
      is_active: 1,
      is_featured: 0,
      is_published: 1,
      published_at: new Date(),
      display_order: 1,
      total_attempts: 0,
      total_completions: 0,
      average_score: 0.00,
      average_time_taken: 0,
      highest_score: 0.00,
      lowest_score: 0.00,
      pass_rate: 0.00,
      created_by: null,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    console.log('✅ Created missing test series 7d6ce252-87c1-4ab5-b4aa-461d4c193ca8 and test');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('new_tests', {
      id: 6
    });
    await queryInterface.bulkDelete('new_test_series', {
      uuid: '7d6ce252-87c1-4ab5-b4aa-461d4c193ca8'
    });
  }
};