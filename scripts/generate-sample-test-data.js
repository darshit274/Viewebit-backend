#!/usr/bin/env node

/**
 * Sample Test Data Generator
 * Generates sample test series, tests, and questions for testing the new system
 */

const { TestSeries, Test, Question } = require('../models');
const { v4: uuidv4 } = require('uuid');

const sampleQuestions = [
  {
    question: "What is the capital of Gujarat?",
    question_gujarati: "ગુજરાતની રાજધાની શું છે?",
    options: [
      {"key": "A", "text": "Ahmedabad"},
      {"key": "B", "text": "Gandhinagar"}, 
      {"key": "C", "text": "Surat"},
      {"key": "D", "text": "Vadodara"}
    ],
    options_gujarati: [
      {"key": "A", "text": "અમદાવાદ"},
      {"key": "B", "text": "ગાંધીનગર"},
      {"key": "C", "text": "સુરત"},
      {"key": "D", "text": "વડોદરા"}
    ],
    correct_option: "B",
    explanation: "Gandhinagar is the capital city of Gujarat state in India.",
    explanation_gujarati: "ગાંધીનગર એ ભારતના ગુજરાત રાજ્યની રાજધાની છે.",
    subject: "General Knowledge",
    difficulty: "easy",
    marks: 1
  },
  {
    question: "If a train travels at 60 km/h for 2 hours, what distance does it cover?",
    question_gujarati: "જો ટ્રેન 2 કલાક માટે 60 કિમી/કલાકની ઝડપે મુસાફરી કરે, તો તે કેટલું અંતર કાપે?",
    options: [
      {"key": "A", "text": "100 km"},
      {"key": "B", "text": "120 km"},
      {"key": "C", "text": "140 km"},
      {"key": "D", "text": "160 km"}
    ],
    options_gujarati: [
      {"key": "A", "text": "100 કિમી"},
      {"key": "B", "text": "120 કિમી"},
      {"key": "C", "text": "140 કિમી"},
      {"key": "D", "text": "160 કિમી"}
    ],
    correct_option: "B",
    explanation: "Distance = Speed × Time = 60 km/h × 2 h = 120 km",
    explanation_gujarati: "અંતર = ઝડપ × સમય = 60 કિમી/કલાક × 2 કલાક = 120 કિમી",
    subject: "Mathematics",
    difficulty: "medium",
    marks: 1
  },
  {
    question: "Which of the following is a primary color?",
    question_gujarati: "નીચેનામાંથી કયો પ્રાથમિક રંગ છે?",
    options: [
      {"key": "A", "text": "Green"},
      {"key": "B", "text": "Orange"},
      {"key": "C", "text": "Red"},
      {"key": "D", "text": "Purple"}
    ],
    options_gujarati: [
      {"key": "A", "text": "લીલો"},
      {"key": "B", "text": "નારંગી"},
      {"key": "C", "text": "લાલ"},
      {"key": "D", "text": "જાંબુડિયો"}
    ],
    correct_option: "C",
    explanation: "Red is one of the three primary colors, along with blue and yellow.",
    explanation_gujarati: "લાલ એ વાદળી અને પીળા સાથે ત્રણ પ્રાથમિક રંગોમાંથી એક છે.",
    subject: "General Knowledge",
    difficulty: "easy",
    marks: 1
  },
  {
    question: "What is 15% of 200?",
    question_gujarati: "200 નો 15% કેટલો થાય?",
    options: [
      {"key": "A", "text": "25"},
      {"key": "B", "text": "30"},
      {"key": "C", "text": "35"},
      {"key": "D", "text": "40"}
    ],
    options_gujarati: [
      {"key": "A", "text": "25"},
      {"key": "B", "text": "30"},
      {"key": "C", "text": "35"},
      {"key": "D", "text": "40"}
    ],
    correct_option: "B",
    explanation: "15% of 200 = (15/100) × 200 = 30",
    explanation_gujarati: "200 નો 15% = (15/100) × 200 = 30",
    subject: "Mathematics",
    difficulty: "easy",
    marks: 1
  },
  {
    question: "Who wrote the novel 'Pride and Prejudice'?",
    question_gujarati: "'પ્રાઇડ એન્ડ પ્રેજુડિસ' નવલકથા કોણે લખી?",
    options: [
      {"key": "A", "text": "Charlotte Brontë"},
      {"key": "B", "text": "Jane Austen"},
      {"key": "C", "text": "Emily Dickinson"},
      {"key": "D", "text": "Virginia Woolf"}
    ],
    options_gujarati: [
      {"key": "A", "text": "ચાર્લોટ બ્રોન્ટે"},
      {"key": "B", "text": "જેન ઓસ્ટેન"},
      {"key": "C", "text": "એમિલી ડિકિન્સન"},
      {"key": "D", "text": "વર્જિનિયા વુલ્ફ"}
    ],
    correct_option: "B",
    explanation: "Jane Austen wrote 'Pride and Prejudice', published in 1813.",
    explanation_gujarati: "જેન ઓસ્ટેને 'પ્રાઇડ એન્ડ પ્રેજુડિસ' લખી, જે 1813માં પ્રકાશિત થઈ.",
    subject: "English Literature",
    difficulty: "medium",
    marks: 1
  }
];

async function generateSampleData() {
  try {
    console.log('🎯 Generating Sample Test Data...\n');

    // Create a sample test series
    console.log('📚 Creating Sample Test Series...');
    const testSeries = await TestSeries.create({
      uuid: uuidv4(),
      title: "Sample Mock Test Series",
      title_gujarati: "નમૂના મોક ટેસ્ટ સિરીઝ",
      description: "A sample test series for demonstration purposes with multilingual questions covering various subjects.",
      description_gujarati: "વિવિધ વિષયોને આવરી લેતા બહુભાષી પ્રશ્નો સાથે પ્રદર્શન હેતુઓ માટે એક નમૂના ટેસ્ટ સિરીઝ.",
      category_id: 4, // PSI category from sample data
      price: 0.00,
      is_free: true,
      free_test_count: 2,
      total_tests: 2,
      difficulty_level: 'mixed',
      supports_pause_resume: true,
      supports_multilanguage: true,
      has_negative_marking: true,
      negative_marks: 0.25,
      instructions: "This is a sample test series. Answer all questions carefully. You can pause and resume the test.",
      instructions_gujarati: "આ એક નમૂના ટેસ્ટ સિરીઝ છે. બધા પ્રશ્નોના કાળજીપૂર્વક જવાબ આપો. તમે ટેસ્ટને રોકી અને ફરી શરૂ કરી શકો છો.",
      is_active: true,
      is_featured: true,
      is_published: true,
      published_at: new Date(),
      slug: 'sample-mock-test-series'
    });
    console.log(`✅ Created test series: ${testSeries.title}`);

    // Create sample tests
    console.log('\n📝 Creating Sample Tests...');
    
    const test1 = await Test.create({
      uuid: uuidv4(),
      title: "Sample Test 1 - Mixed Topics",
      title_gujarati: "નમૂના ટેસ્ટ 1 - મિશ્ર વિષયો",
      description: "A mixed test covering general knowledge and mathematics",
      description_gujarati: "સામાન્ય જ્ઞાન અને ગણિતને આવરી લેતી મિશ્ર ટેસ્ટ",
      test_series_id: testSeries.id,
      test_type: 'practice',
      duration_minutes: 30,
      total_questions: 5,
      total_marks: 5,
      passing_marks: 3,
      is_free: true,
      allows_pause: true,
      has_negative_marking: true,
      negative_marks: 0.25,
      marks_per_question: 1,
      show_results_immediately: true,
      show_correct_answers: true,
      show_explanations: true,
      supports_multilanguage: true,
      instructions: "Answer all 5 questions within 30 minutes. Each correct answer gives 1 mark, wrong answer deducts 0.25 marks.",
      instructions_gujarati: "30 મિનિટમાં બધા 5 પ્રશ્નોના જવાબ આપો. દરેક સાચા જવાબ માટે 1 માર્ક મળે છે, ખોટા જવાબ માટે 0.25 માર્ક કપાય છે.",
      is_active: true,
      display_order: 1
    });
    console.log(`✅ Created test: ${test1.title}`);

    const test2 = await Test.create({
      uuid: uuidv4(),
      title: "Sample Test 2 - Advanced",
      title_gujarati: "નમૂના ટેસ્ટ 2 - ઉન્નત",
      description: "An advanced test for experienced users",
      description_gujarati: "અનુભવી વપરાશકર્તાઓ માટે એક ઉન્નત ટેસ્ટ",
      test_series_id: testSeries.id,
      test_type: 'mock',
      duration_minutes: 45,
      total_questions: 0, // Will be updated after questions are added
      total_marks: 0, // Will be updated after questions are added
      passing_marks: 3,
      is_free: true,
      allows_pause: true,
      has_negative_marking: true,
      negative_marks: 0.25,
      marks_per_question: 1,
      show_results_immediately: true,
      show_correct_answers: true,
      show_explanations: true,
      supports_multilanguage: true,
      instructions: "This is an advanced level test. Take your time to read each question carefully.",
      instructions_gujarati: "આ એક ઉન્નત સ્તરની ટેસ્ટ છે. દરેક પ્રશ્નને કાળજીપૂર્વક વાંચવા માટે તમારો સમય લો.",
      is_active: true,
      display_order: 2
    });
    console.log(`✅ Created test: ${test2.title}`);

    // Add questions to test 1 (all 5 questions)
    console.log('\n❓ Adding Questions to Tests...');
    
    for (let i = 0; i < sampleQuestions.length; i++) {
      const questionData = {
        ...sampleQuestions[i],
        uuid: uuidv4(),
        test_id: test1.id,
        display_order: i + 1,
        is_active: true
      };
      
      const question = await Question.create(questionData);
      console.log(`   ✅ Added question ${i + 1}: ${question.question.substring(0, 50)}...`);
    }

    // Update test 1 totals
    await test1.update({
      total_questions: 5,
      total_marks: 5
    });

    // Add 3 questions to test 2 (subset for advanced test)
    const advancedQuestions = sampleQuestions.slice(1, 4); // Math and literature questions
    
    for (let i = 0; i < advancedQuestions.length; i++) {
      const questionData = {
        ...advancedQuestions[i],
        uuid: uuidv4(),
        test_id: test2.id,
        display_order: i + 1,
        is_active: true
      };
      
      const question = await Question.create(questionData);
      console.log(`   ✅ Added advanced question ${i + 1}: ${question.question.substring(0, 50)}...`);
    }

    // Update test 2 totals
    await test2.update({
      total_questions: 3,
      total_marks: 3
    });

    // Update test series totals
    await testSeries.update({
      total_tests: 2,
      total_questions: 8
    });

    console.log('\n🎉 Sample Data Generation Complete!');
    console.log('\n📊 What was created:');
    console.log(`   • 1 Test Series: "${testSeries.title}"`);
    console.log(`   • 2 Tests: Practice test (5 questions) and Mock test (3 questions)`);
    console.log(`   • 8 Total Questions with English + Gujarati content`);
    console.log(`   • Full multilingual support`);
    console.log(`   • Pause/resume functionality enabled`);
    console.log(`   • Negative marking configured`);
    
    console.log('\n🚀 Ready to Test!');
    console.log('   • Access via admin panel to manage tests');
    console.log('   • Students can now take the sample tests');
    console.log('   • All APIs are ready for frontend integration');
    console.log('   • Check TEST_SYSTEM_API_DOCS.md for API usage');

  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  generateSampleData().then(() => {
    process.exit(0);
  });
}

module.exports = { generateSampleData, sampleQuestions };