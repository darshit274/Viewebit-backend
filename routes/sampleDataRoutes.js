const express = require('express');
const router = express.Router();
const { TestSeries, Category, Question } = require('../models');

// Temporary route to add sample questions to a test series
router.post('/test-series/:uuid/add-sample-questions', async (req, res) => {
  try {
    const { uuid } = req.params;

    // Find the test series
    const testSeries = await TestSeries.findOne({
      where: { uuid, is_active: true }
    });

    if (!testSeries) {
      return res.status(404).json({
        success: false,
        message: 'Test series not found'
      });
    }

    // Create a sample category for this test series
    const category = await Category.create({
      test_series_id: testSeries.id,
      name: 'General Knowledge',
      description: 'General knowledge questions for practice',
      name_gujarati: 'સામાન્ય જ્ઞાન',
      description_gujarati: 'પ્રેક્ટિસ માટે સામાન્ય જ્ઞાન પ્રશ્નો',
      node_type: 'question_holder',
      hierarchy_level: 0,
      display_order: 1,
      is_active: true
    });

    // Sample questions data
    const sampleQuestions = [
      {
        question_text: "What is the capital of India?",
        question_text_gujarati: "ભારતની રાજધાની શું છે?",
        option_a: "Mumbai",
        option_a_gujarati: "મુંબઈ",
        option_b: "New Delhi",
        option_b_gujarati: "નવી દિલ્હી",
        option_c: "Kolkata",
        option_c_gujarati: "કોલકાતા",
        option_d: "Chennai",
        option_d_gujarati: "ચેન્નઈ",
        correct_answer: "B",
        explanation: "New Delhi is the capital of India.",
        explanation_gujarati: "નવી દિલ્હી ભારતની રાજધાની છે.",
        marks: 1
      },
      {
        question_text: "Which planet is known as the Red Planet?",
        question_text_gujarati: "કયો ગ્રહ લાલ ગ્રહ તરીકે ઓળખાય છે?",
        option_a: "Venus",
        option_a_gujarati: "શુક્ર",
        option_b: "Mars",
        option_b_gujarati: "મંગળ",
        option_c: "Jupiter",
        option_c_gujarati: "બૃહસ્પતિ",
        option_d: "Saturn",
        option_d_gujarati: "શનિ",
        correct_answer: "B",
        explanation: "Mars is called the Red Planet due to its reddish appearance.",
        explanation_gujarati: "મંગળને તેના લાલ રંગને કારણે લાલ ગ્રહ કહેવામાં આવે છે.",
        marks: 1
      },
      {
        question_text: "What is the largest ocean on Earth?",
        question_text_gujarati: "પૃથ્વી પર સૌથી મોટો સમુદ્ર કયો છે?",
        option_a: "Atlantic Ocean",
        option_a_gujarati: "એટલાન્ટિક મહાસાગર",
        option_b: "Indian Ocean",
        option_b_gujarati: "હિંદ મહાસાગર",
        option_c: "Arctic Ocean",
        option_c_gujarati: "આર્કટિક મહાસાગર",
        option_d: "Pacific Ocean",
        option_d_gujarati: "પ્રશાંત મહાસાગર",
        correct_answer: "D",
        explanation: "The Pacific Ocean is the largest ocean on Earth.",
        explanation_gujarati: "પ્રશાંત મહાસાગર પૃથ્વી પરનો સૌથી મોટો સમુદ્ર છે.",
        marks: 1
      },
      {
        question_text: "Who wrote the Indian National Anthem?",
        question_text_gujarati: "ભારતનું રાષ્ટ્રગીત કોણે લખ્યું?",
        option_a: "Mahatma Gandhi",
        option_a_gujarati: "મહાત્મા ગાંધી",
        option_b: "Rabindranath Tagore",
        option_b_gujarati: "રબીન્દ્રનાથ ટાગોર",
        option_c: "Jawaharlal Nehru",
        option_c_gujarati: "જવાહરલાલ નેહરુ",
        option_d: "Subhas Chandra Bose",
        option_d_gujarati: "સુભાષ ચંદ્ર બોસ",
        correct_answer: "B",
        explanation: "Rabindranath Tagore wrote the Indian National Anthem 'Jana Gana Mana'.",
        explanation_gujarati: "રબીન્દ્રનાથ ટાગોરે ભારતનું રાષ્ટ્રગીત 'જન ગણ મન' લખ્યું.",
        marks: 1
      },
      {
        question_text: "What is the chemical symbol for Gold?",
        question_text_gujarati: "સોનાનું રાસાયણિક ચિહ્ન શું છે?",
        option_a: "Go",
        option_a_gujarati: "ગો",
        option_b: "Gd",
        option_b_gujarati: "જીડી",
        option_c: "Au",
        option_c_gujarati: "એયુ",
        option_d: "Ag",
        option_d_gujarati: "એજી",
        correct_answer: "C",
        explanation: "Au is the chemical symbol for Gold, derived from the Latin word 'aurum'.",
        explanation_gujarati: "એયુ એ સોનાનું રાસાયણિક ચિહ્ન છે, જે લેટિન શબ્દ 'ઓરમ'માંથી આવ્યું છે.",
        marks: 1
      }
    ];

    // Create questions
    const createdQuestions = await Promise.all(
      sampleQuestions.map((questionData, index) =>
        Question.create({
          ...questionData,
          category_id: category.id,
          display_order: index + 1,
          is_active: true
        })
      )
    );

    res.json({
      success: true,
      message: 'Sample questions added successfully',
      data: {
        testSeries: {
          id: testSeries.id,
          uuid: testSeries.uuid,
          name: testSeries.name
        },
        category: {
          id: category.id,
          uuid: category.uuid,
          name: category.name
        },
        questionsCreated: createdQuestions.length
      }
    });

  } catch (error) {
    console.error('Error adding sample questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add sample questions',
      error: error.message
    });
  }
});

module.exports = router;