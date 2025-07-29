'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Insert root level categories (Exam-wise)
    await queryInterface.bulkInsert('exam_categories', [
      {
        id: 1,
        name: 'Exam-wise Test Series',
        name_gujarati: 'પરીક્ષા પ્રમાણે ટેસ્ટ સિરીઝ',
        description: 'Test series organized by specific competitive exams',
        description_gujarati: 'ચોક્કસ સ્પર્ધાત્મક પરીક્ષાઓ દ્વારા ગોઠવવામાં આવેલ ટેસ્ટ સિરીઝ',
        hierarchy_level: 0,
        parent_id: null,
        hierarchy_path: '/1',
        display_order: 1,
        color_code: '#4f46e5',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 2,
        name: 'Topic-wise Test Series',
        name_gujarati: 'વિષય પ્રમાણે ટેસ્ટ સિરીઝ',
        description: 'Test series organized by subjects and topics',
        description_gujarati: 'વિષયો અને વિષયો દ્વારા ગોઠવવામાં આવેલ ટેસ્ટ સિરીઝ',
        hierarchy_level: 0,
        parent_id: null,
        hierarchy_path: '/2',
        display_order: 2,
        color_code: '#059669',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 3,
        name: 'Chapter-wise Test Series',
        name_gujarati: 'પ્રકરણ પ્રમાણે ટેસ્ટ સિરીઝ',
        description: 'Detailed chapter-wise test series based on textbooks',
        description_gujarati: 'પાઠ્યપુસ્તકો પર આધારિત વિગતવાર પ્રકરણ-વાર ટેસ્ટ સિરીઝ',
        hierarchy_level: 0,
        parent_id: null,
        hierarchy_path: '/3',
        display_order: 3,
        color_code: '#dc2626',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]);

    // Insert exam-wise subcategories (Level 1)
    await queryInterface.bulkInsert('exam_categories', [
      {
        id: 4,
        name: 'Police Sub Inspector (PSI)',
        name_gujarati: 'પોલીસ સબ ઇન્સ્પેક્ટર (PSI)',
        description: 'Mock test series for Gujarat PSI recruitment exam',
        description_gujarati: 'ગુજરાત PSI ભરતી પરીક્ષા માટે મોક ટેસ્ટ સિરીઝ',
        hierarchy_level: 1,
        parent_id: 1,
        hierarchy_path: '/1/4',
        display_order: 1,
        color_code: '#4f46e5',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 5,
        name: 'GPSC Various Posts',
        name_gujarati: 'GPSC વિવિધ પોસ્ટ્સ',
        description: 'Test series for Gujarat Public Service Commission exams',
        description_gujarati: 'ગુજરાત લોક સેવા આયોગની પરીક્ષાઓ માટે ટેસ્ટ સિરીઝ',
        hierarchy_level: 1,
        parent_id: 1,
        hierarchy_path: '/1/5',
        display_order: 2,
        color_code: '#4f46e5',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 6,
        name: 'Deputy Section Officer (DSO)',
        name_gujarati: 'ડેપ્યુટી સેક્શન ઓફિસર (DSO)',
        description: 'Mock test series for DSO recruitment',
        description_gujarati: 'DSO ભરતી માટે મોક ટેસ્ટ સિરીઝ',
        hierarchy_level: 1,
        parent_id: 1,
        hierarchy_path: '/1/6',
        display_order: 3,
        color_code: '#4f46e5',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 7,
        name: 'Gujarat Administrative Service (GAS)',
        name_gujarati: 'ગુજરાત વહીવટી સેવા (GAS)',
        description: 'Test series for Gujarat Administrative Service',
        description_gujarati: 'ગુજરાત વહીવટી સેવા માટે ટેસ્ટ સિરીઝ',
        hierarchy_level: 1,
        parent_id: 1,
        hierarchy_path: '/1/7',
        display_order: 4,
        color_code: '#4f46e5',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]);

    // Insert topic-wise subcategories (Level 1)
    await queryInterface.bulkInsert('exam_categories', [
      {
        id: 8,
        name: 'Mathematics',
        name_gujarati: 'ગણિત',
        description: 'Mathematics topic-wise test series',
        description_gujarati: 'ગણિત વિષય-વાર ટેસ્ટ સિરીઝ',
        hierarchy_level: 1,
        parent_id: 2,
        hierarchy_path: '/2/8',
        display_order: 1,
        color_code: '#059669',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 9,
        name: 'General Knowledge',
        name_gujarati: 'સામાન્ય જ્ઞાન',
        description: 'General Knowledge and Current Affairs',
        description_gujarati: 'સામાન્ય જ્ઞાન અને સમસામયિક બાબતો',
        hierarchy_level: 1,
        parent_id: 2,
        hierarchy_path: '/2/9',
        display_order: 2,
        color_code: '#059669',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 10,
        name: 'English Language',
        name_gujarati: 'અંગ્રેજી ભાષા',
        description: 'English grammar, vocabulary, and comprehension',
        description_gujarati: 'અંગ્રેજી વ્યાકરણ, શબ્દભંડોળ અને સમજ',
        hierarchy_level: 1,
        parent_id: 2,
        hierarchy_path: '/2/10',
        display_order: 3,
        color_code: '#059669',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 11,
        name: 'Gujarati Language',
        name_gujarati: 'ગુજરાતી ભાષા',
        description: 'Gujarati language and literature',
        description_gujarati: 'ગુજરાતી ભાષા અને સાહિત્ય',
        hierarchy_level: 1,
        parent_id: 2,
        hierarchy_path: '/2/11',
        display_order: 4,
        color_code: '#059669',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 12,
        name: 'Reasoning',
        name_gujarati: 'તર્કશક્તિ',
        description: 'Logical and analytical reasoning',
        description_gujarati: 'તાર્કિક અને વિશ્લેષણાત્મક તર્કશક્તિ',
        hierarchy_level: 1,
        parent_id: 2,
        hierarchy_path: '/2/12',
        display_order: 5,
        color_code: '#059669',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]);

    // Insert chapter-wise subcategories (Level 1)
    await queryInterface.bulkInsert('exam_categories', [
      {
        id: 13,
        name: 'NCERT Based',
        name_gujarati: 'NCERT આધારિત',
        description: 'NCERT textbook-based test series',
        description_gujarati: 'NCERT પાઠ્યપુસ્તક આધારિત ટેસ્ટ સિરીઝ',
        hierarchy_level: 1,
        parent_id: 3,
        hierarchy_path: '/3/13',
        display_order: 1,
        color_code: '#dc2626',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 14,
        name: 'Gujarat Board',
        name_gujarati: 'ગુજરાત બોર્ડ',
        description: 'Gujarat State Board textbook-based tests',
        description_gujarati: 'ગુજરાત રાજ્ય બોર્ડ પાઠ્યપુસ્તક આધારિત ટેસ્ટ',
        hierarchy_level: 1,
        parent_id: 3,
        hierarchy_path: '/3/14',
        display_order: 2,
        color_code: '#dc2626',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]);

    // Insert NCERT class-wise categories (Level 2)
    const ncertClasses = [
      { class: 6, order: 1 },
      { class: 7, order: 2 },
      { class: 8, order: 3 },
      { class: 9, order: 4 },
      { class: 10, order: 5 },
      { class: 11, order: 6 },
      { class: 12, order: 7 }
    ];

    const ncertClassCategories = ncertClasses.map((item, index) => ({
      id: 15 + index,
      name: `Class ${item.class}`,
      name_gujarati: `ધોરણ ${item.class}`,
      description: `NCERT Class ${item.class} chapter-wise tests`,
      description_gujarati: `NCERT ધોરણ ${item.class} પ્રકરણ-વાર ટેસ્ટ`,
      hierarchy_level: 2,
      parent_id: 13,
      hierarchy_path: `/3/13/${15 + index}`,
      display_order: item.order,
      color_code: '#dc2626',
      is_active: true,
      created_at: now,
      updated_at: now
    }));

    await queryInterface.bulkInsert('exam_categories', ncertClassCategories);

    // Insert some math sub-topics (Level 2)
    await queryInterface.bulkInsert('exam_categories', [
      {
        id: 22,
        name: 'Algebra',
        name_gujarati: 'બીજગણિત',
        description: 'Algebraic equations and expressions',
        description_gujarati: 'બીજગણિતીય સમીકરણો અને અભિવ્યક્તિઓ',
        hierarchy_level: 2,
        parent_id: 8,
        hierarchy_path: '/2/8/22',
        display_order: 1,
        color_code: '#059669',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 23,
        name: 'Geometry',
        name_gujarati: 'ભૂમિતિ',
        description: 'Geometric shapes and theorems',
        description_gujarati: 'ભૌમિતિક આકારો અને પ્રમેયો',
        hierarchy_level: 2,
        parent_id: 8,
        hierarchy_path: '/2/8/23',
        display_order: 2,
        color_code: '#059669',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 24,
        name: 'Arithmetic',
        name_gujarati: 'અંકગણિત',
        description: 'Basic arithmetic operations and concepts',
        description_gujarati: 'મૂળભૂત અંકગણિત કામગીરી અને વિભાવનાઓ',
        hierarchy_level: 2,
        parent_id: 8,
        hierarchy_path: '/2/8/24',
        display_order: 3,
        color_code: '#059669',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]);

    console.log('Sample exam categories populated successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('exam_categories', null, {});
  }
};